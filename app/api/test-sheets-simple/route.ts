import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function GET(request: NextRequest) {
  try {
    console.log("Starting simple sheets test...")

    // 環境変数の確認
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      return NextResponse.json({ success: false, error: "GOOGLE_SHEETS_CREDENTIALS not set" })
    }

    if (!process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json({ success: false, error: "GOOGLE_SHEET_ID not set" })
    }

    // 認証設定
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    console.log("Attempting to access spreadsheet:", spreadsheetId)

    // 1. スプレッドシートの基本情報を取得
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    console.log("Spreadsheet info retrieved successfully")

    // 2. 最初のシートの名前を取得
    const firstSheet = spreadsheetInfo.data.sheets?.[0]
    const sheetName = firstSheet?.properties?.title || "Sheet1"

    console.log("First sheet name:", sheetName)

    // 3. シンプルな読み取りテスト（範囲指定なし）
    let readResult = "Failed"
    try {
      const readResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z1000`, // 明示的にシート名を指定
      })
      readResult = `Success - Found ${readResponse.data.values?.length || 0} rows`
      console.log("Read test successful")
    } catch (readError) {
      readResult = `Failed: ${readError instanceof Error ? readError.message : "Unknown error"}`
      console.error("Read test failed:", readError)
    }

    // 4. シンプルな書き込みテスト
    let writeResult = "Failed"
    try {
      const testData = [["テスト", "データ", new Date().toISOString()]]
      const writeResponse = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:C`, // 明示的にシート名を指定
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: testData,
        },
      })
      writeResult = `Success - Updated range: ${writeResponse.data.updates?.updatedRange}`
      console.log("Write test successful")
    } catch (writeError) {
      writeResult = `Failed: ${writeError instanceof Error ? writeError.message : "Unknown error"}`
      console.error("Write test failed:", writeError)
    }

    return NextResponse.json({
      success: true,
      spreadsheetTitle: spreadsheetInfo.data.properties?.title,
      sheetName,
      readTest: readResult,
      writeTest: writeResult,
    })
  } catch (error) {
    console.error("Error in simple sheets test:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
