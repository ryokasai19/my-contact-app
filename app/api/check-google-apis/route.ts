import { type NextRequest, NextResponse } from "next/server"
import { testGoogleApiConnection, getCredentialsInfo } from "@/lib/google-api-client"
import { getSpreadsheetInfo } from "@/lib/google-sheets"
import { testGoogleDriveConnection, getFolderInfo } from "@/lib/google-drive"

export async function GET(request: NextRequest) {
  try {
    console.log("=== Google APIs 統合診断開始 ===")

    // 環境変数チェック
    const envCheck = {
      GOOGLE_API_CREDENTIALS: !!process.env.GOOGLE_API_CREDENTIALS,
      GOOGLE_SHEETS_CREDENTIALS: !!process.env.GOOGLE_SHEETS_CREDENTIALS,
      GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
      GOOGLE_DRIVE_FOLDER_ID: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    }

    // 認証情報の取得
    let credentialsInfo
    try {
      credentialsInfo = getCredentialsInfo()
    } catch (credError) {
      return NextResponse.json({
        success: false,
        error: "認証情報の取得に失敗しました",
        envCheck,
        credentialsError: credError instanceof Error ? credError.message : "Unknown error",
      })
    }

    // 基本的なGoogle API接続テスト
    const apiConnectionTest = await testGoogleApiConnection()

    // Google Sheets情報取得
    let sheetsInfo = null
    let sheetsError = null
    if (process.env.GOOGLE_SHEET_ID) {
      try {
        sheetsInfo = await getSpreadsheetInfo()
      } catch (error) {
        sheetsError = error instanceof Error ? error.message : "Unknown error"
      }
    }

    // Google Drive詳細テスト
    const driveTest = await testGoogleDriveConnection()

    // フォルダ情報取得
    let folderDetails = null
    if (process.env.GOOGLE_DRIVE_FOLDER_ID && driveTest.success) {
      try {
        folderDetails = await getFolderInfo(process.env.GOOGLE_DRIVE_FOLDER_ID)
      } catch (error) {
        console.error("Error getting folder details:", error)
      }
    }

    const overallSuccess = apiConnectionTest.success && driveTest.success && !sheetsError

    return NextResponse.json({
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      environmentVariables: envCheck,
      credentialsInfo: {
        client_email: credentialsInfo.client_email,
        project_id: credentialsInfo.project_id,
        client_id: credentialsInfo.client_id,
      },
      apiConnectionTest,
      sheetsInfo,
      sheetsError,
      driveTest,
      folderDetails,
      recommendations: {
        useUnifiedCredentials: !envCheck.GOOGLE_API_CREDENTIALS && envCheck.GOOGLE_SHEETS_CREDENTIALS,
        apiOptimizations: [
          "統一された認証クライアントを使用",
          "APIクライアントのシングルトンパターン実装",
          "エラーハンドリングの改善",
          "Shared Drive完全対応",
        ],
      },
    })
  } catch (error) {
    console.error("Error in Google APIs diagnosis:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
