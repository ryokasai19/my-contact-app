import { type NextRequest, NextResponse } from "next/server"
import { processAudio } from "@/lib/openai"
import { extractInfoFromImage } from "@/lib/openai-vision"
import { appendToSheet } from "@/lib/google-sheets"

// 最大ファイルサイズ (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const imageFile = formData.get("image") as File | null
    const audioFile = formData.get("audio") as File | null

    if (!imageFile || !audioFile) {
      return NextResponse.json({ success: false, error: "画像と音声ファイルの両方が必要です" }, { status: 400 })
    }

    // ファイルサイズのチェック
    if (imageFile.size === 0 || audioFile.size === 0) {
      return NextResponse.json({ success: false, error: "ファイルが空です" }, { status: 400 })
    }

    if (imageFile.size > MAX_FILE_SIZE || audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `ファイルサイズが大きすぎます (最大 ${MAX_FILE_SIZE / (1024 * 1024)}MB)` },
        { status: 400 },
      )
    }

    console.log("Processing files:", {
      image: `${imageFile.name} (${imageFile.size / 1024} KB), type: ${imageFile.type}`,
      audio: `${audioFile.name} (${audioFile.size / 1024} KB), type: ${audioFile.type}`,
    })

    try {
      // 画像から情報を抽出
      console.log("Converting image file to buffer...")
      const imageArrayBuffer = await imageFile.arrayBuffer()
      console.log(`Image array buffer created, size: ${imageArrayBuffer.byteLength} bytes`)

      const imageBuffer = Buffer.from(imageArrayBuffer)
      console.log(`Image buffer created, size: ${imageBuffer.length} bytes`)

      // 画像処理と音声処理を順次実行（並行処理ではなく）
      console.log("Starting sequential processing of image and audio...")

      // 画像処理
      let extractedInfo
      try {
        console.log("Calling extractInfoFromImage...")
        extractedInfo = await extractInfoFromImage(imageBuffer)
        console.log("Extracted info from image:", extractedInfo)
      } catch (imageError) {
        console.error("Error in image extraction:", imageError)
        // エラー時はデフォルト値を設定
        extractedInfo = {
          company: "画像処理エラー",
          name: "画像処理エラー",
          email: "",
          phone: "",
          jobTitle: "",
          badgeId: "",
        }
      }

      // 音声処理
      console.log("Processing audio...")
      let transcription = ""
      let summary = ""
      try {
        const audioResult = await processAudio(audioFile)
        transcription = audioResult.transcription
        summary = audioResult.summary
        console.log("Audio processed successfully")
        console.log("Transcription:", transcription.substring(0, 50) + "...")
        console.log("Summary:", summary.substring(0, 50) + "...")
      } catch (audioError) {
        console.error("Error processing audio:", audioError)

        // Whisper APIエラーの特別な処理
        if (audioError instanceof Error && audioError.message.includes("Whisper API error")) {
          return NextResponse.json(
            {
              success: false,
              error: "音声認識に失敗しました。別の形式で録音するか、より短い音声を試してください。",
            },
            { status: 500 },
          )
        }

        return NextResponse.json(
          {
            success: false,
            error: audioError instanceof Error ? audioError.message : "音声処理中にエラーが発生しました",
          },
          { status: 500 },
        )
      }

      // Google Sheetsに保存
      try {
        const sheetId = process.env.GOOGLE_SHEET_ID
        if (!sheetId) {
          console.error("GOOGLE_SHEET_ID is not defined")
          return NextResponse.json(
            {
              success: false,
              error: "Google Sheets IDが設定されていません。",
            },
            { status: 500 },
          )
        }

        await appendToSheet(sheetId, "A:J", [
          // "Sheet1!"プレフィックスを削除
          [
            extractedInfo.company,
            extractedInfo.name,
            extractedInfo.email,
            extractedInfo.phone,
            extractedInfo.jobTitle || "",
            extractedInfo.badgeId || "",
            transcription,
            summary,
            "Google Drive連携は無効化されました",
            "Google Drive連携は無効化されました",
          ],
        ])

        console.log("Data appended to sheet successfully")
        return NextResponse.json({ success: true })
      } catch (sheetError) {
        console.error("Error appending to sheet:", sheetError)
        return NextResponse.json(
          {
            success: false,
            error: "Google Sheetsにデータを保存できませんでした。",
          },
          { status: 500 },
        )
      }
    } catch (processingError) {
      console.error("Error processing files:", processingError)
      return NextResponse.json(
        {
          success: false,
          error:
            processingError instanceof Error
              ? `処理中にエラーが発生しました: ${processingError.message}`
              : "処理中に不明なエラーが発生しました",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error submitting data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "不明なエラーが発生しました",
      },
      { status: 500 },
    )
  }
}
