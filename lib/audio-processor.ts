import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

interface AudioProcessingResult {
  transcription: string
  summary: string
}

/**
 * 音声データを直接OpenAI APIに送信して処理する関数
 * FormDataの作成やファイル変換などの中間ステップを省略
 */
export async function processAudioDirectly(audioBuffer: Buffer, mimeType: string): Promise<AudioProcessingResult> {
  try {
    console.log(`Processing audio directly: size=${audioBuffer.length} bytes, type=${mimeType}`)

    // OpenAI APIに直接送信するためのFormDataを作成
    const formData = new FormData()

    // 適切なファイル名とMIMEタイプを設定
    let filename = "audio"
    const contentType = mimeType || "audio/webm"

    // MIMEタイプに基づいて拡張子を設定
    if (contentType.includes("mp3") || contentType.includes("mpeg")) {
      filename += ".mp3"
    } else if (contentType.includes("mp4") || contentType.includes("m4a")) {
      filename += ".mp4"
    } else if (contentType.includes("wav")) {
      filename += ".wav"
    } else {
      filename += ".webm"
    }

    // Blobを作成
    const blob = new Blob([audioBuffer], { type: contentType })

    // FormDataにファイルを追加
    formData.append("file", blob, filename)
    formData.append("model", "whisper-1") // whisper-1モデルを使用（gpt-4o-transcribeの代わり）
    formData.append("language", "ja")
    formData.append("response_format", "text")

    console.log(
      `Sending request to OpenAI API with model: whisper-1, filename: ${filename}, contentType: ${contentType}`,
    )

    // OpenAI APIを呼び出す
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API error response:", errorText)
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    // レスポンスを処理
    const transcription = await response.text()
    console.log(`Received transcription (${transcription.length} chars)`)

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

    return { transcription, summary }
  } catch (error) {
    console.error("Error in processAudioDirectly:", error)
    throw error
  }
}
