import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export async function processAudio(audioFile: File) {
  try {
    // ファイルタイプをログに記録
    console.log(`Processing audio file: ${audioFile.name}, type: ${audioFile.type}, size: ${audioFile.size / 1024} KB`)

    // 音声ファイルをArrayBufferに変換
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)
    console.log(`Audio buffer created, size: ${audioBuffer.length} bytes`)

    // 大きなファイルの場合は処理方法を変更
    const isLargeFile = audioFile.size > 1500 * 1024 // 1500KB以上を大きなファイルとみなす

    // OpenAI Whisperを使用して文字起こし
    // タイムアウトを長めに設定
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒タイムアウト

    try {
      // ファイルタイプを判断
      const isWAV = audioFile.type.includes("wav") || audioFile.name.endsWith(".wav")
      const isMP3 = audioFile.type.includes("mp3") || audioFile.name.endsWith(".mp3")
      const isMP4 = audioFile.type.includes("mp4") || audioFile.name.endsWith(".mp4")

      // 適切なMIMEタイプを決定
      let mimeType = "audio/wav"
      if (isMP3) {
        mimeType = "audio/mpeg"
      } else if (isMP4) {
        mimeType = "audio/mp4"
      } else if (!isWAV) {
        mimeType = "audio/webm"
      }

      console.log(`Using MIME type: ${mimeType} for Whisper API request`)

      // FormDataを作成
      const formData = new FormData()

      // iOSの場合は特別な処理
      const isIOS = audioFile.type.includes("mp4") || audioFile.name.includes("mp4")

      if (isIOS) {
        console.log("iOS audio file detected, using original file")
        // 元のファイルをそのまま使用
        formData.append("file", audioFile)
      } else {
        // 他のデバイスの場合は適切なBlobを作成
        const blob = new Blob([audioBuffer], { type: mimeType })

        // 適切な拡張子を決定
        let extension = ".wav"
        if (isMP3) {
          extension = ".mp3"
        } else if (isMP4) {
          extension = ".mp4"
        } else if (!isWAV) {
          extension = ".webm"
        }

        const filename = `recording${extension}`
        formData.append("file", blob, filename)
      }

      formData.append("model", "whisper-1")
      formData.append("language", "ja")

      // 大きなファイルの場合は圧縮設定を追加
      if (isLargeFile) {
        formData.append("response_format", "text")
      }

      console.log(`Sending request to Whisper API...`)

      // 直接fetch APIを使用してWhisper APIを呼び出す
      const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text()
        console.error("Whisper API error response:", errorText)
        throw new Error(`Whisper API error: ${transcriptionResponse.status} ${transcriptionResponse.statusText}`)
      }

      // レスポンスの処理
      let transcription = ""
      try {
        const transcriptionData = await transcriptionResponse.json()
        transcription = transcriptionData.text
      } catch (jsonError) {
        console.log("Response is not JSON, trying text format...")
        transcription = await transcriptionResponse.text()
      }

      console.log("Transcription received:", transcription.substring(0, 100) + "...")

      // ChatGPTを使用して要約
      const { text: summary } = await generateText({
        model: openai("gpt-4o"),
        prompt: `以下のテキストを100文字程度に要約してください。元のニュアンスを保ちながら、簡潔にまとめてください：\n\n${transcription}`,
      })

      console.log("Summary generated:", summary.substring(0, 100) + "...")

      return { transcription, summary }
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as Error).name === "AbortError") {
        throw new Error("音声処理がタイムアウトしました。より短い録音を試してください。")
      }
      throw error
    }
  } catch (error) {
    console.error("Error processing audio:", error)
    throw error
  }
}
