import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

// 直接音声を文字起こしするAPIエンドポイント
export async function POST(request: NextRequest) {
  try {
    // リクエストからフォームデータを取得
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ success: false, error: "音声ファイルが必要です" }, { status: 400 })
    }

    // ファイルサイズのチェック
    if (audioFile.size === 0) {
      return NextResponse.json({ success: false, error: "ファイルが空です" }, { status: 400 })
    }

    console.log(`Processing audio file: ${audioFile.name}, type: ${audioFile.type}, size: ${audioFile.size / 1024} KB`)

    // 音声ファイルをArrayBufferに変換
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)
    console.log(`Audio buffer created, size: ${audioBuffer.length} bytes`)

    // FormDataを作成
    const apiFormData = new FormData()

    // ファイル名を適切に設定
    let filename = audioFile.name
    if (!filename.includes(".")) {
      // 拡張子がない場合、MIMEタイプから推測
      const ext = audioFile.type.split("/")[1] || "mp3"
      filename = `recording.${ext}`
    }

    // iOSの場合は特別な処理
    const isIOS = audioFile.type.includes("mp4") || audioFile.name.includes("mp4") || audioFile.name.includes("m4a")
    if (isIOS) {
      filename = "recording.m4a"
    }

    // Blobを作成して追加
    const blob = new Blob([audioBuffer], { type: audioFile.type || "audio/webm" })
    apiFormData.append("file", blob, filename)

    // モデルをgpt-4o-transcribeに設定
    apiFormData.append("model", "gpt-4o-transcribe")
    apiFormData.append("language", "ja")
    apiFormData.append("response_format", "text")

    console.log(`Sending request to OpenAI API with model: gpt-4o-transcribe, filename: ${filename}`)

    // OpenAI APIを呼び出す
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: apiFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API error response:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: 500 },
      )
    }

    // レスポンスの処理
    const transcription = await response.text()
    console.log("Transcription received:", transcription.substring(0, 100) + "...")

    // 要約を生成
    let summary = ""
    if (transcription.length > 100) {
      try {
        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: `以下のテキストを100文字程度に要約してください。元のニュアンスを保ちながら、簡潔にまとめてください：\n\n${transcription}`,
        })
        summary = text
      } catch (summaryError) {
        console.error("Error generating summary:", summaryError)
        summary = "要約の生成に失敗しました。"
      }
    } else {
      summary = transcription
    }

    return NextResponse.json({
      success: true,
      transcription,
      summary,
    })
  } catch (error) {
    console.error("Error in direct transcription:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "不明なエラーが発生しました",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
