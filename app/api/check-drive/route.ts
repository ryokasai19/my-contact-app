import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function GET(request: NextRequest) {
  try {
    console.log("=== Google Drive API 詳細診断開始 (強化版) ===")

    // 環境変数チェック
    const envCheck = {
      GOOGLE_SHEETS_CREDENTIALS: !!process.env.GOOGLE_SHEETS_CREDENTIALS,
      GOOGLE_DRIVE_FOLDER_ID: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    }

    if (!envCheck.GOOGLE_SHEETS_CREDENTIALS || !envCheck.GOOGLE_DRIVE_FOLDER_ID) {
      return NextResponse.json({
        success: false,
        error: "必要な環境変数が設定されていません",
        envCheck,
      })
    }

    // 認証情報の解析
    let credentials
    try {
      credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS!)
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: "認証情報のJSONパースに失敗しました",
        parseError: parseError instanceof Error ? parseError.message : "Unknown error",
      })
    }

    const serviceAccountEmail = credentials.client_email
    const projectId = credentials.project_id

    // 認証スコープを拡張
    const scopes = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.folder",
      "https://www.googleapis.com/auth/drive.metadata",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ]

    // 認証オブジェクトの作成
    let auth
    try {
      auth = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key.replace(/\\n/g, "\n"),
        scopes,
      )
    } catch (authCreateError) {
      return NextResponse.json({
        success: false,
        error: "認証オブジェクトの作成に失敗しました",
        authCreateError: authCreateError instanceof Error ? authCreateError.message : "Unknown error",
        serviceAccountEmail,
        projectId,
      })
    }

    const testResults = {
      authTest: false,
      driveApiTest: false,
      folderExistsTest: false,
      folderPermissionsTest: false,
      createFileTest: false,
    }

    const detailedInfo: any = {
      scopes: scopes,
      credentialsInfo: {
        hasPrivateKey: !!credentials.private_key,
        privateKeyLength: credentials.private_key?.length || 0,
        hasClientEmail: !!credentials.client_email,
        hasProjectId: !!credentials.project_id,
      },
    }

    // 1. 認証テスト（詳細版）
    try {
      console.log("認証テスト開始...")
      await auth.authorize()
      testResults.authTest = true
      console.log("✓ 認証成功")

      // アクセストークンの取得確認
      const accessToken = await auth.getAccessToken()
      detailedInfo.authInfo = {
        hasAccessToken: !!accessToken.token,
        tokenType: typeof accessToken.token,
      }
    } catch (authError) {
      console.error("✗ 認証失敗:", authError)
      detailedInfo.authError = {
        message: authError instanceof Error ? authError.message : "Unknown error",
        code: (authError as any)?.code,
        status: (authError as any)?.status,
      }

      return NextResponse.json({
        success: false,
        error: "認証に失敗しました",
        testResults,
        serviceAccountEmail,
        projectId,
        detailedInfo,
      })
    }

    // 2. Google APIs利用可能性テスト
    try {
      console.log("Google APIs基本テスト...")
      const oauth2 = google.oauth2({ version: "v2", auth })
      const userInfo = await oauth2.userinfo.get()
      detailedInfo.oauth2Test = {
        success: true,
        userInfo: userInfo.data,
      }
      console.log("✓ Google APIs基本テスト成功")
    } catch (oauth2Error) {
      console.error("Google APIs基本テスト失敗:", oauth2Error)
      detailedInfo.oauth2Error = {
        message: oauth2Error instanceof Error ? oauth2Error.message : "Unknown error",
        code: (oauth2Error as any)?.code,
      }
    }

    // 3. Drive API利用可能性テスト（詳細版）
    let drive
    try {
      console.log("Drive API インスタンス作成...")
      drive = google.drive({ version: "v3", auth })

      console.log("Drive API about.get テスト...")
      const aboutResponse = await drive.about.get({
        fields: "user, storageQuota, importFormats, exportFormats",
      })

      testResults.driveApiTest = true
      detailedInfo.driveApiInfo = {
        user: aboutResponse.data.user,
        storageQuota: aboutResponse.data.storageQuota,
        hasImportFormats: !!aboutResponse.data.importFormats,
        hasExportFormats: !!aboutResponse.data.exportFormats,
      }
      console.log("✓ Drive API利用可能")
    } catch (apiError) {
      console.error("✗ Drive API利用不可:", apiError)

      const errorDetails = {
        message: apiError instanceof Error ? apiError.message : "Unknown error",
        code: (apiError as any)?.code,
        status: (apiError as any)?.status,
        details: (apiError as any)?.details,
        errors: (apiError as any)?.errors,
      }

      detailedInfo.driveApiError = errorDetails

      // エラーコード別の詳細分析
      if ((apiError as any)?.code === 403) {
        const errorMessage = errorDetails.message.toLowerCase()
        if (errorMessage.includes("google drive api has not been used") || errorMessage.includes("api not enabled")) {
          detailedInfo.driveApiError.diagnosis = "Google Drive APIが有効化されていません"
          detailedInfo.driveApiError.solution = `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${projectId}`
          detailedInfo.driveApiError.actionRequired = "Google Drive APIを有効化してください"
          detailedInfo.driveApiError.priority = "HIGH"
        } else if (errorMessage.includes("insufficient authentication scopes")) {
          detailedInfo.driveApiError.diagnosis = "認証スコープが不足しています"
          detailedInfo.driveApiError.actionRequired = "より広いスコープで認証してください"
          detailedInfo.driveApiError.currentScopes = scopes
        } else if (errorMessage.includes("invalid_grant")) {
          detailedInfo.driveApiError.diagnosis = "認証情報が無効または期限切れです"
          detailedInfo.driveApiError.actionRequired = "サービスアカウントキーを再生成してください"
          detailedInfo.driveApiError.priority = "HIGH"
        } else {
          detailedInfo.driveApiError.diagnosis = "API利用権限がありません"
          detailedInfo.driveApiError.actionRequired = "プロジェクトの設定を確認してください"
        }
      } else if ((apiError as any)?.code === 401) {
        detailedInfo.driveApiError.diagnosis = "認証情報が無効です"
        detailedInfo.driveApiError.actionRequired = "サービスアカウントキーを確認してください"
        detailedInfo.driveApiError.priority = "HIGH"
      } else if ((apiError as any)?.code === 400) {
        detailedInfo.driveApiError.diagnosis = "リクエストが無効です"
        detailedInfo.driveApiError.actionRequired = "認証情報の形式を確認してください"
      } else {
        detailedInfo.driveApiError.diagnosis = "不明なエラーが発生しました"
        detailedInfo.driveApiError.actionRequired = "Google Cloud Consoleでプロジェクト設定を確認してください"
      }

      // Drive APIが利用できない場合は以降のテストをスキップ
      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        serviceAccountEmail,
        projectId,
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        testResults,
        detailedInfo,
        envCheck,
        sharedDriveSupport: true,
      })
    }

    // 4. フォルダ存在確認テスト（Shared Drive対応）
    try {
      console.log("フォルダアクセステスト開始 (Shared Drive対応)...")
      const folderResponse = await drive.files.get({
        fileId: process.env.GOOGLE_DRIVE_FOLDER_ID!,
        fields: "id, name, webViewLink, owners, createdTime, modifiedTime, capabilities, permissions",
        supportsAllDrives: true,
      })

      testResults.folderExistsTest = true
      detailedInfo.folderInfo = {
        id: folderResponse.data.id,
        name: folderResponse.data.name,
        webViewLink: folderResponse.data.webViewLink,
        owners: folderResponse.data.owners,
        createdTime: folderResponse.data.createdTime,
        modifiedTime: folderResponse.data.modifiedTime,
        capabilities: folderResponse.data.capabilities,
        permissions: folderResponse.data.permissions,
      }
      console.log("✓ フォルダ存在確認成功 (Shared Drive対応)")
    } catch (folderError) {
      console.error("✗ フォルダアクセス失敗:", folderError)
      detailedInfo.folderError = {
        message: folderError instanceof Error ? folderError.message : "Unknown error",
        code: (folderError as any)?.code,
        status: (folderError as any)?.status,
        errors: (folderError as any)?.errors,
      }

      // エラーコード別の詳細情報
      if ((folderError as any)?.code === 404) {
        detailedInfo.folderError.diagnosis = "フォルダが見つかりません"
        detailedInfo.folderError.currentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
        detailedInfo.folderError.actionRequired = "フォルダIDが正しいか確認してください"
        detailedInfo.folderError.suggestion = "フォルダのURLからIDを再確認してください"
      } else if ((folderError as any)?.code === 403) {
        detailedInfo.folderError.diagnosis = "フォルダへのアクセス権限がありません"
        detailedInfo.folderError.serviceAccount = serviceAccountEmail
        detailedInfo.folderError.actionRequired = "フォルダの共有設定でサービスアカウントを編集者として追加してください"
        detailedInfo.folderError.folderUrl = `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_FOLDER_ID}`
        detailedInfo.folderError.priority = "HIGH"
      }
    }

    // 5. フォルダ権限詳細テスト（フォルダアクセスが成功した場合のみ）
    if (testResults.folderExistsTest) {
      try {
        const permissionsResponse = await drive.permissions.list({
          fileId: process.env.GOOGLE_DRIVE_FOLDER_ID!,
          fields: "permissions(id, type, role, emailAddress, displayName)",
          supportsAllDrives: true,
        })

        const allPermissions = permissionsResponse.data.permissions || []
        const serviceAccountPermission = allPermissions.find((perm) => perm.emailAddress === serviceAccountEmail)

        detailedInfo.permissions = {
          all: allPermissions,
          serviceAccount: serviceAccountPermission,
          hasPermission: !!serviceAccountPermission,
          totalCount: allPermissions.length,
        }

        if (serviceAccountPermission) {
          testResults.folderPermissionsTest = true
          console.log("✓ サービスアカウント権限確認成功")
        } else {
          console.log("✗ サービスアカウント権限なし")
          detailedInfo.permissionsError = {
            message: "サービスアカウントの権限が見つかりません",
            actionRequired: `フォルダの共有設定で ${serviceAccountEmail} を編集者として追加してください`,
            priority: "HIGH",
          }
        }
      } catch (permError) {
        console.error("権限確認エラー:", permError)
        detailedInfo.permissionsError = {
          message: permError instanceof Error ? permError.message : "Unknown error",
          actionRequired: "フォルダの権限設定を確認してください",
        }
      }
    }

    // 6. ファイル作成テスト（権限がある場合のみ）
    if (testResults.folderPermissionsTest) {
      try {
        const testContent = Buffer.from(`Drive API Test with Enhanced Diagnostics - ${new Date().toISOString()}`)
        const testFileName = `enhanced_test_${Date.now()}.txt`

        const createResponse = await drive.files.create({
          requestBody: {
            name: testFileName,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
          },
          media: {
            mimeType: "text/plain",
            body: testContent,
          },
          fields: "id, webViewLink, name, size",
          supportsAllDrives: true,
        })

        // テストファイルを即座に削除
        if (createResponse.data.id) {
          await drive.files.delete({
            fileId: createResponse.data.id,
            supportsAllDrives: true,
          })
        }

        testResults.createFileTest = true
        detailedInfo.fileTestResult = {
          success: true,
          fileId: createResponse.data.id,
          webViewLink: createResponse.data.webViewLink,
          fileName: createResponse.data.name,
          fileSize: createResponse.data.size,
          sharedDriveSupport: true,
        }
        console.log("✓ ファイル作成テスト成功")
      } catch (createError) {
        console.error("✗ ファイル作成失敗:", createError)
        detailedInfo.fileTestError = {
          message: createError instanceof Error ? createError.message : "Unknown error",
          code: (createError as any)?.code,
          status: (createError as any)?.status,
          actionRequired: "フォルダの書き込み権限を確認してください",
        }
      }
    }

    const overallSuccess = Object.values(testResults).every((result) => result === true)

    return NextResponse.json({
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      serviceAccountEmail,
      projectId,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      testResults,
      detailedInfo,
      envCheck,
      sharedDriveSupport: true,
      enhancedDiagnostics: true,
    })
  } catch (error) {
    console.error("Drive API診断エラー:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        sharedDriveSupport: true,
        enhancedDiagnostics: true,
      },
      { status: 500 },
    )
  }
}
