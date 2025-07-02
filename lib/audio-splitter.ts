import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

// 音声ファイルを処理する関数
export async function processAudioInChunks(audioFile: File) {
  try {
    console.log(`Processing audio file: ${audioFile.name}, type: ${audioFile.type}, size: ${audioFile.size / 1024} KB`)

    // gpt-4o-transcribeを使用して文字起こし
    const transcription = await transcribeWithGPT4o(audioFile)
    console.log(`Transcription complete (${transcription.length} chars): ${transcription.substring(0, 100)}...`)

    // 要約を生成
    const summary = await generateSummary(transcription)
    console.log(`Summary generated: ${summary}`)

    return { transcription, summary }
  } catch (error) {
    console.error("Error processing audio:", error)
    throw error
  }
}

// gpt-4o-transcribeを使用して文字起こしを行う関数
async function transcribeWithGPT4o(audioFile: File): Promise<string> {
  try {
    console.log(
      `Transcribing with gpt-4o-transcribe: ${audioFile.name}, size: ${audioFile.size / 1024} KB, type: ${audioFile.type}`,
    )

    // 音声ファイルをArrayBufferに変換
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)
    console.log(`Audio buffer created, size: ${audioBuffer.length} bytes`)

    // FormDataを作成
    const formData = new FormData()

    // ファイル名を適切に設定
    let filename = audioFile.name
    if (!filename.includes(".")) {
      // 拡張子がない場合、MIMEタイプから推測
      const ext = audioFile.type.split("/")[1] || "mp3"
      filename = `recording.${ext}`
    }

    // iOSの場合は特別な処理
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    if (isIOS) {
      filename = "recording.m4a"
    }

    // Blobを作成して追加
    const blob = new Blob([audioBuffer], { type: audioFile.type || "audio/webm" })
    formData.append("file", blob, filename)

    // モデルをgpt-4o-transcribeに設定
    formData.append("model", "gpt-4o-transcribe")
    formData.append("language", "ja")
    formData.append("response_format", "text")

    console.log(`Sending request to OpenAI API with model: gpt-4o-transcribe, filename: ${filename}`)

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
    const text = await response.text()
    console.log(`Received transcription (${text.length} chars)`)

    return text || ""
  } catch (error) {
    console.error("Error transcribing with gpt-4o-transcribe:", error)
    throw error
  }
}

// 文字起こしから要約を生成する関数
async function generateSummary(transcription: string): Promise<string> {
  try {
    // 文字起こしが短い場合は要約せずにそのまま返す
    if (transcription.length < 100) {
      return transcription
    }

    const { text: summary } = await generateText({
      model: openai("gpt-4o"),
      prompt: `以下のテキストを100文字程度に要約してください。元のニュアンスを保ちながら、簡潔にまとめてください：\n\n${transcription}`,
    })

    return summary
  } catch (error) {
    console.error("Error generating summary:", error)
    return "要約の生成に失敗しました。"
  }
}
