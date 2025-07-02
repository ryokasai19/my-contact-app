"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, Copy, ExternalLink } from "lucide-react"

interface DiagnosisResult {
  success: boolean
  environmentVariables: {
    GOOGLE_SHEETS_CREDENTIALS: boolean
    GOOGLE_SHEET_ID: boolean
    OPENAI_API_KEY: boolean
    GOOGLE_DRIVE_FOLDER_ID: boolean
  }
  rawCredentialsLength?: number
  credentials?: {
    type: string
    project_id: string
    private_key_id: string
    client_email: string
    client_id: string
    hasPrivateKey: boolean
    privateKeyLength?: number
    privateKeyStart?: string
  }
  credentialsError?: string
  sheetsTest?: {
    title: string
    sheetCount: number
    sheets: Array<{ title: string; sheetId: number; gridProperties?: { rowCount: number; columnCount: number } }>
    spreadsheetId: string
    readTest?: {
      success: boolean
      range: string
      values?: any[][]
      error?: string
      errorCode?: string
    }
    writeTest?: {
      success: boolean
      updatedRange: string
      updatedCells: number
      error?: string
      errorCode?: string
    }
  }
  sheetsError?: {
    message: string
    code?: string
    status?: string
    details?: any[]
  }
  error?: string
  timestamp?: number
  authTest?: {
    authObjectCreated: boolean
    authClientObtained: boolean
    clientType?: string
  }
  driveTest?: {
    success: boolean
    folderInfo?: {
      id: string
      name: string
      webViewLink: string
    }
    testResults?: {
      authTest: boolean
      folderAccessTest: boolean
      fileUploadTest: boolean
      fileDeleteTest: boolean
    }
    error?: string
  }
  driveError?: string
}

export default function SheetsDiagnosisPage() {
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function runDiagnosis() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/check-sheets")
        if (!response.ok) {
          throw new Error("Failed to fetch diagnosis")
        }
        const data = await response.json()
        setDiagnosis(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "診断中にエラーが発生しました")
      } finally {
        setIsLoading(false)
      }
    }

    runDiagnosis()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("クリップボードにコピーしました"))
      .catch((err) => console.error("コピーに失敗しました:", err))
  }

  const getStatusIcon = (status: boolean | string) => {
    if (typeof status === "boolean") {
      return status ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-red-500" />
      )
    }
    return status.includes("Success") ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-xl">Google Sheets 診断</CardTitle>
          <CardDescription>Google Sheets連携の設定状況を詳細に確認します</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                詳細診断を実行中...
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : diagnosis ? (
            <>
              {/* タイムスタンプ */}
              {diagnosis.timestamp && (
                <div className="text-xs text-gray-500">
                  診断実行時刻: {new Date(diagnosis.timestamp).toLocaleString("ja-JP")}
                </div>
              )}

              {/* 環境変数チェック */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">環境変数の設定状況</h3>
                <div className="bg-gray-50 p-4 rounded-md border space-y-2">
                  {Object.entries(diagnosis.environmentVariables).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-mono">{key}:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(value)}
                        <span className="text-sm">{value ? "設定済み" : "未設定"}</span>
                      </div>
                    </div>
                  ))}
                  {diagnosis.rawCredentialsLength && (
                    <div className="text-xs text-gray-600 mt-2">
                      認証情報サイズ: {diagnosis.rawCredentialsLength} 文字
                    </div>
                  )}
                </div>
              </div>

              {/* 認証テスト結果 */}
              {diagnosis.authTest && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">認証テスト結果</h3>
                  <div className="bg-gray-50 p-4 rounded-md border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">認証オブジェクト作成:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnosis.authTest.authObjectCreated)}
                        <span className="text-sm">{diagnosis.authTest.authObjectCreated ? "成功" : "失敗"}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">認証クライアント取得:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnosis.authTest.authClientObtained)}
                        <span className="text-sm">{diagnosis.authTest.authClientObtained ? "成功" : "失敗"}</span>
                      </div>
                    </div>
                    {diagnosis.authTest.clientType && (
                      <div className="text-xs text-gray-600">クライアントタイプ: {diagnosis.authTest.clientType}</div>
                    )}
                  </div>
                </div>
              )}

              {/* 認証情報詳細 */}
              {diagnosis.credentials && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Google サービスアカウント情報</h3>
                  <div className="bg-gray-50 p-4 rounded-md border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">サービスアカウントメール:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(diagnosis.credentials!.client_email)}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          <span className="text-xs">コピー</span>
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm break-all font-mono bg-white p-2 rounded border">
                      {diagnosis.credentials.client_email}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">プロジェクトID:</span>
                        <p className="font-mono">{diagnosis.credentials.project_id}</p>
                      </div>
                      <div>
                        <span className="font-medium">クライアントID:</span>
                        <p className="font-mono">{diagnosis.credentials.client_id}</p>
                      </div>
                      <div>
                        <span className="font-medium">キーID:</span>
                        <p className="font-mono">{diagnosis.credentials.private_key_id}</p>
                      </div>
                      <div>
                        <span className="font-medium">秘密鍵:</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(diagnosis.credentials.hasPrivateKey)}
                          <span>
                            {diagnosis.credentials.hasPrivateKey
                              ? `存在 (${diagnosis.credentials.privateKeyLength}文字)`
                              : "なし"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {diagnosis.credentials.privateKeyStart && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                        秘密鍵の開始部分: {diagnosis.credentials.privateKeyStart}...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {diagnosis.credentialsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>認証情報エラー: {diagnosis.credentialsError}</AlertDescription>
                </Alert>
              )}

              {/* Google Sheetsテスト結果 */}
              {diagnosis.sheetsTest && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Google Sheets 接続テスト</h3>
                  <div className="bg-green-50 p-4 rounded-md border border-green-200 space-y-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">スプレッドシートアクセス成功！</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">スプレッドシート名:</span>
                      <p className="text-sm">{diagnosis.sheetsTest.title}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">スプレッドシートID:</span>
                      <p className="text-sm font-mono">{diagnosis.sheetsTest.spreadsheetId}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">シート数:</span>
                      <p className="text-sm">{diagnosis.sheetsTest.sheetCount}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">シート一覧:</span>
                      <ul className="text-sm space-y-1">
                        {diagnosis.sheetsTest.sheets.map((sheet) => (
                          <li key={sheet.sheetId} className="ml-4">
                            • {sheet.title} (ID: {sheet.sheetId})
                            {sheet.gridProperties && (
                              <span className="text-xs text-gray-600 ml-2">
                                ({sheet.gridProperties.rowCount}行 × {sheet.gridProperties.columnCount}列)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 読み取りテスト結果 */}
                    {diagnosis.sheetsTest.readTest && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(diagnosis.sheetsTest.readTest.success)}
                          <span className="text-sm font-medium">
                            読み取りテスト: {diagnosis.sheetsTest.readTest.success ? "成功" : "失敗"}
                          </span>
                        </div>
                        {diagnosis.sheetsTest.readTest.success ? (
                          <div className="text-xs text-gray-600 ml-6">
                            範囲: {diagnosis.sheetsTest.readTest.range}
                            {diagnosis.sheetsTest.readTest.values && (
                              <div>データ: {JSON.stringify(diagnosis.sheetsTest.readTest.values)}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-red-600 ml-6">
                            エラー: {diagnosis.sheetsTest.readTest.error}
                            {diagnosis.sheetsTest.readTest.errorCode && (
                              <div>コード: {diagnosis.sheetsTest.readTest.errorCode}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 書き込みテスト結果 */}
                    {diagnosis.sheetsTest.writeTest && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(diagnosis.sheetsTest.writeTest.success)}
                          <span className="text-sm font-medium">
                            書き込みテスト: {diagnosis.sheetsTest.writeTest.success ? "成功" : "失敗"}
                          </span>
                        </div>
                        {diagnosis.sheetsTest.writeTest.success ? (
                          <div className="text-xs text-gray-600 ml-6">
                            更新範囲: {diagnosis.sheetsTest.writeTest.updatedRange}
                            <div>更新セル数: {diagnosis.sheetsTest.writeTest.updatedCells}</div>
                          </div>
                        ) : (
                          <div className="text-xs text-red-600 ml-6">
                            エラー: {diagnosis.sheetsTest.writeTest.error}
                            {diagnosis.sheetsTest.writeTest.errorCode && (
                              <div>コード: {diagnosis.sheetsTest.writeTest.errorCode}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Google Drive接続テスト結果 */}
              {diagnosis.driveTest && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Google Drive 接続テスト</h3>
                  {diagnosis.driveTest.success ? (
                    <div className="bg-green-50 p-4 rounded-md border border-green-200 space-y-3">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Google Drive接続成功！</span>
                      </div>

                      {diagnosis.driveTest.folderInfo && (
                        <div>
                          <span className="text-sm font-medium">ベースフォルダ:</span>
                          <p className="text-sm">{diagnosis.driveTest.folderInfo.name}</p>
                          <p className="text-xs font-mono text-gray-600">{diagnosis.driveTest.folderInfo.id}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(diagnosis.driveTest!.folderInfo!.webViewLink, "_blank")}
                            className="mt-1 h-6 px-2"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            <span className="text-xs">フォルダを開く</span>
                          </Button>
                        </div>
                      )}

                      {diagnosis.driveTest.testResults && (
                        <div className="border-t pt-3">
                          <span className="text-sm font-medium">詳細テスト結果:</span>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(diagnosis.driveTest.testResults.authTest)}
                              <span className="text-sm">認証テスト</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(diagnosis.driveTest.testResults.folderAccessTest)}
                              <span className="text-sm">フォルダアクセス</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(diagnosis.driveTest.testResults.fileUploadTest)}
                              <span className="text-sm">ファイルアップロード</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(diagnosis.driveTest.testResults.fileDeleteTest)}
                              <span className="text-sm">ファイル削除</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 p-4 rounded-md border border-red-200">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Google Drive接続失敗</span>
                      </div>
                      {diagnosis.driveTest.error && (
                        <p className="text-sm text-red-600 mt-2">{diagnosis.driveTest.error}</p>
                      )}
                      {diagnosis.driveTest.testResults && (
                        <div className="mt-3">
                          <span className="text-sm font-medium">テスト結果:</span>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(diagnosis.driveTest.testResults.authTest)}
                              <span className="text-sm">認証テスト</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(diagnosis.driveTest.testResults.folderAccessTest)}
                              <span className="text-sm">フォルダアクセス</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(diagnosis.driveTest.testResults.fileUploadTest)}
                              <span className="text-sm">ファイルアップロード</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(diagnosis.driveTest.testResults.fileDeleteTest)}
                              <span className="text-sm">ファイル削除</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {diagnosis.driveError && !diagnosis.driveTest && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Google Driveエラー: {diagnosis.driveError}</AlertDescription>
                </Alert>
              )}

              {/* エラー詳細 */}
              {diagnosis.sheetsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>Google Sheetsエラー: {diagnosis.sheetsError.message}</div>
                      {diagnosis.sheetsError.code && (
                        <div className="text-xs">エラーコード: {diagnosis.sheetsError.code}</div>
                      )}
                      {diagnosis.sheetsError.status && (
                        <div className="text-xs">ステータス: {diagnosis.sheetsError.status}</div>
                      )}
                      {diagnosis.sheetsError.details && (
                        <div className="text-xs">詳細: {JSON.stringify(diagnosis.sheetsError.details)}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* トラブルシューティングガイド */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">トラブルシューティング</h3>
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 space-y-3">
                  <div className="text-sm space-y-2">
                    <p className="font-medium">よくある問題と解決方法:</p>

                    <div className="ml-4 space-y-2">
                      <div>
                        <p className="font-medium text-red-600">403 Forbidden エラー</p>
                        <p className="text-xs">→ サービスアカウントがスプレッドシートの編集者として追加されていない</p>
                      </div>

                      <div>
                        <p className="font-medium text-red-600">404 Not Found エラー</p>
                        <p className="text-xs">→ スプレッドシートIDが間違っているか、スプレッドシートが存在しない</p>
                      </div>

                      <div>
                        <p className="font-medium text-red-600">401 Unauthorized エラー</p>
                        <p className="text-xs">→ サービスアカウントの認証情報が間違っている</p>
                      </div>

                      <div>
                        <p className="font-medium text-red-600">Unable to parse range エラー</p>
                        <p className="text-xs">→ シート名に特殊文字が含まれているか、範囲指定が間違っている</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>

        <CardFooter>
          <Button onClick={() => (window.location.href = "/")} className="w-full">
            トップページに戻る
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
