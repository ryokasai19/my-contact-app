import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { testGoogleDriveConnection } from "@/lib/google-drive"

export async function GET(request: NextRequest) {
  try {
    console.log("=== Google Sheets 詳細診断開始 ===")

    // 環境変数の存在確認
    const envCheck = {
      GOOGLE_SHEETS_CREDENTIALS: !!process.env.GOOGLE_SHEETS_CREDENTIALS,
      GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GOOGLE_DRIVE_FOLDER_ID: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    }

    console.log("Environment variables check:", envCheck)

    // Google Sheets認証情報の詳細解析
    let credentialsInfo = null
    let credentialsError = null
    let rawCredentialsLength = 0

    try {
      if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
        const rawCreds = process.env.GOOGLE_SHEETS_CREDENTIALS
        rawCredentialsLength = rawCreds.length
        console.log(`Raw credentials length: ${rawCredentialsLength}`)

        const credentials = JSON.parse(rawCreds)
        credentialsInfo = {
          type: credentials.type,
          project_id: credentials.project_id,
          private_key_id: credentials.private_key_id,
          client_email: credentials.client_email,
          client_id: credentials.client_id,
          hasPrivateKey: !!credentials.private_key,
          privateKeyLength: credentials.private_key ? credentials.private_key.length : 0,
        }
        console.log("Credentials parsed successfully:", {
          client_email: credentials.client_email,
          project_id: credentials.project_id,
          hasPrivateKey: !!credentials.private_key,
        })
      }
    } catch (error) {
      credentialsError = error instanceof Error ? error.message : "Unknown error parsing credentials"
      console.error("Credentials parsing error:", error)
    }

    // Google Sheets APIテスト（段階的）
    let sheetsTest = null
    let sheetsError = null
    let authTest = null

    try {
      if (process.env.GOOGLE_SHEETS_CREDENTIALS && process.env.GOOGLE_SHEET_ID) {
        console.log("=== 認証テスト開始 ===")

        const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)

        // 1. 認証オブジェクトの作成テスト
        console.log("Creating auth object...")
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        })

        // 2. 認証クライアントの取得テスト
        console.log("Getting auth client...")
        const authClient = await auth.getClient()
        authTest = {
          authObjectCreated: true,
          authClientObtained: !!authClient,
          clientType: authClient.constructor.name,
        }
        console.log("Auth test result:", authTest)

        // 3. Sheets APIクライアントの作成
        console.log("Creating sheets client...")
        const sheets = google.sheets({ version: "v4", auth })

        // 4. スプレッドシートの基本情報を取得
        console.log(`Attempting to access spreadsheet: ${process.env.GOOGLE_SHEET_ID}`)

        try {
          const spreadsheetResponse = await sheets.spreadsheets.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
          })

          console.log("Spreadsheet access successful!")

          const firstSheet = spreadsheetResponse.data.sheets?.[0]
          const firstSheetName = firstSheet?.properties?.title || "Sheet1"

          // シート名をエスケープする関数
          const escapeSheetName = (name: string) => {
            // シート名に特殊文字が含まれている場合は単一引用符で囲む
            if (name.includes(" ") || name.includes("!") || name.includes("'") || /[^\w]/.test(name)) {
              return `'${name.replace(/'/g, "''")}'`
            }
            return name
          }

          const escapedSheetName = escapeSheetName(firstSheetName)
          console.log(`Original sheet name: "${firstSheetName}", Escaped: "${escapedSheetName}"`)

          sheetsTest = {
            title: spreadsheetResponse.data.properties?.title,
            sheetCount: spreadsheetResponse.data.sheets?.length,
            sheets: spreadsheetResponse.data.sheets?.map((sheet) => ({
              title: sheet.properties?.title,
              sheetId: sheet.properties?.sheetId,
              gridProperties: sheet.properties?.gridProperties,
            })),
            spreadsheetId: spreadsheetResponse.data.spreadsheetId,
            spreadsheetUrl: spreadsheetResponse.data.spreadsheetUrl,
            firstSheetName: firstSheetName,
            escapedSheetName: escapedSheetName,
          }

          // 5. 複数の範囲形式でテスト
          const testRanges = [
            `${escapedSheetName}!A1:A1`,
            `${escapedSheetName}!A1`,
            "A1:A1",
            "A1",
            `${firstSheetName}!A1:A1`, // エスケープなし
          ]

          const readTestResults = []

          for (const range of testRanges) {
            try {
              console.log(`Testing read with range: "${range}"`)
              const readResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: range,
              })
              readTestResults.push({
                range: range,
                success: true,
                actualRange: readResponse.data.range,
                values: readResponse.data.values,
                majorDimension: readResponse.data.majorDimension,
              })
              console.log(`Read test successful with range: "${range}"`)
              break // 成功したら他の形式はテストしない
            } catch (readError) {
              readTestResults.push({
                range: range,
                success: false,
                error: readError instanceof Error ? readError.message : "Unknown error",
                errorCode: (readError as any)?.code,
                errorStatus: (readError as any)?.status,
              })
              console.error(`Read test failed with range "${range}":`, readError)
            }
          }

          sheetsTest.readTestResults = readTestResults
          sheetsTest.readTest = readTestResults.find((r) => r.success) || readTestResults[0]

          // 6. 書き込みテスト（成功した読み取り形式を使用）
          const successfulReadTest = readTestResults.find((r) => r.success)
          if (successfulReadTest) {
            // 成功した範囲形式を使って書き込みテスト
            const writeRange = successfulReadTest.range.includes("!")
              ? successfulReadTest.range.replace(/A1.*/, "A:B")
              : "A:B"

            console.log(`Testing write with range: "${writeRange}"`)
            try {
              const testData = [["診断テスト", new Date().toISOString()]]
              const writeResponse = await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: writeRange,
                valueInputOption: "USER_ENTERED",
                insertDataOption: "INSERT_ROWS",
                requestBody: {
                  values: testData,
                },
              })
              sheetsTest.writeTest = {
                success: true,
                range: writeRange,
                updatedRange: writeResponse.data.updates?.updatedRange,
                updatedRows: writeResponse.data.updates?.updatedRows,
                updatedColumns: writeResponse.data.updates?.updatedColumns,
                updatedCells: writeResponse.data.updates?.updatedCells,
              }
              console.log("Write test successful:", sheetsTest.writeTest)
            } catch (writeError) {
              sheetsTest.writeTest = {
                success: false,
                range: writeRange,
                error: writeError instanceof Error ? writeError.message : "Unknown error",
                errorCode: (writeError as any)?.code,
                errorStatus: (writeError as any)?.status,
              }
              console.error("Write test failed:", writeError)
            }
          } else {
            sheetsTest.writeTest = {
              success: false,
              error: "読み取りテストが全て失敗したため、書き込みテストをスキップしました",
            }
          }
        } catch (spreadsheetError) {
          console.error("Spreadsheet access failed:", spreadsheetError)
          sheetsError = {
            message: spreadsheetError instanceof Error ? spreadsheetError.message : "Unknown error",
            code: (spreadsheetError as any)?.code,
            status: (spreadsheetError as any)?.status,
            details: (spreadsheetError as any)?.details,
          }
        }
      }
    } catch (error) {
      console.error("General sheets test error:", error)
      sheetsError = {
        message: error instanceof Error ? error.message : "Unknown error",
        code: (error as any)?.code,
        status: (error as any)?.status,
        stack: error instanceof Error ? error.stack : undefined,
      }
    }

    // Google Drive接続テスト
    let driveTest = null
    let driveError = null

    try {
      if (process.env.GOOGLE_SHEETS_CREDENTIALS && process.env.GOOGLE_DRIVE_FOLDER_ID) {
        console.log("=== Google Drive接続テスト開始 ===")
        const driveTestResult = await testGoogleDriveConnection()

        if (driveTestResult.success) {
          driveTest = {
            success: true,
            folderInfo: driveTestResult.folderInfo,
            testResults: driveTestResult.testResults,
          }
          console.log("Google Drive test successful:", driveTest)
        } else {
          driveError = driveTestResult.error
          driveTest = {
            success: false,
            testResults: driveTestResult.testResults,
          }
          console.error("Google Drive test failed:", driveError)
        }
      } else {
        driveTest = {
          success: false,
          error: "必要な環境変数が設定されていません",
        }
      }
    } catch (error) {
      console.error("Google Drive test error:", error)
      driveError = error instanceof Error ? error.message : "Unknown error"
      driveTest = {
        success: false,
        error: driveError,
      }
    }

    console.log("=== 診断完了 ===")

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environmentVariables: envCheck,
      credentials: credentialsInfo,
      credentialsError,
      rawCredentialsLength,
      authTest,
      sheetsTest,
      sheetsError,
      driveTest,
      driveError,
    })
  } catch (error) {
    console.error("Error in detailed sheets check:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
