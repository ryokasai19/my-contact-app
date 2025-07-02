"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, Copy, ExternalLink, RefreshCw, Info } from "lucide-react"

interface GoogleApisDiagnosisResult {
  success: boolean
  timestamp: string
  environmentVariables: {
    GOOGLE_API_CREDENTIALS: boolean
    GOOGLE_SHEETS_CREDENTIALS: boolean
    GOOGLE_SHEET_ID: boolean
    GOOGLE_DRIVE_FOLDER_ID: boolean
    OPENAI_API_KEY: boolean
  }
  credentialsInfo: {
    client_email: string
    project_id: string
    client_id: string
  }
  apiConnectionTest: {
    success: boolean
    error?: string
  }
  sheetsInfo?: {
    title: string
    sheets: Array<{
      title: string
      sheetId: number
      gridProperties?: {
        rowCount: number
        columnCount: number
      }
    }>
  }
  sheetsError?: string
  driveTest: {
    success: boolean
    folderInfo?: {
      id: string
      name: string
      webViewLink: string
      permissions?: any[]
    }
    testResults?: {
      authTest: boolean
      driveApiEnabled: boolean
      folderAccessTest: boolean
      folderPermissionsTest: boolean
      fileUploadTest: boolean
      fileDeleteTest: boolean
    }
    error?: string
  }
  folderDetails?: {
    id: string
    name: string
    webViewLink: string
    owners: any[]
    createdTime: string
    modifiedTime: string
  }
  recommendations?: {
    useUnifiedCredentials: boolean
    apiOptimizations: string[]
  }
  error?: string
}

export default function GoogleApisDiagnosisPage() {
  const [result, setResult] = useState<GoogleApisDiagnosisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const runDiagnosis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/check-google-apis")
      if (!response.ok) {
        throw new Error("診断APIの呼び出しに失敗しました")
      }
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "診断中にエラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runDiagnosis()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("クリップボードにコピーしました"))
      .catch((err) => console.error("コピーに失敗しました:", err))
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle className="text-xl">Google APIs 統合診断</CardTitle>
          <CardDescription>Google Sheets & Drive API連携の統合診断を行います</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Google APIs統合診断を実行中...
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : result ? (
            <>
              {/* 全体ステータス */}
              <Alert variant={result.success ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.success)}
                  <span className="font-medium">
                    {result.success ? "Google APIs連携は正常に動作しています" : "Google APIs連携に問題があります"}
                  </span>
                </div>
                <AlertDescription className="mt-2">
                  診断実行時刻: {new Date(result.timestamp).toLocaleString("ja-JP")}
                </AlertDescription>
              </Alert>

              {/* 環境変数チェック */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">環境変数設定状況</h3>
                <div className="bg-gray-50 p-4 rounded-md border space-y-2">
                  {Object.entries(result.environmentVariables).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-mono">{key}:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(value)}
                        <span className="text-sm">{value ? "設定済み" : "未設定"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 認証情報 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">サービスアカウント情報</h3>
                <div className="bg-gray-50 p-4 rounded-md border space-y-2">
                  <div>
                    <span className="text-sm font-medium">メールアドレス:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono bg-white p-2 rounded border flex-1">
                        {result.credentialsInfo.client_email}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.credentialsInfo.client_email)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">プロジェクトID:</span>
                      <p className="font-mono">{result.credentialsInfo.project_id}</p>
                    </div>
                    <div>
                      <span className="font-medium">クライアントID:</span>
                      <p className="font-mono">{result.credentialsInfo.client_id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* API接続テスト */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">API接続テスト</h3>
                <div className="bg-gray-50 p-4 rounded-md border">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.apiConnectionTest.success)}
                    <span className="text-sm font-medium">
                      基本API接続: {result.apiConnectionTest.success ? "成功" : "失敗"}
                    </span>
                  </div>
                  {result.apiConnectionTest.error && (
                    <p className="text-sm text-red-600 mt-2">{result.apiConnectionTest.error}</p>
                  )}
                </div>
              </div>

              {/* Google Sheets情報 */}
              {result.sheetsInfo && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Google Sheets情報</h3>
                  <div className="bg-green-50 p-4 rounded-md border border-green-200 space-y-2">
                    <div>
                      <span className="text-sm font-medium">スプレッドシート名:</span>
                      <p className="text-sm">{result.sheetsInfo.title}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">シート一覧:</span>
                      <ul className="text-sm space-y-1 mt-1">
                        {result.sheetsInfo.sheets.map((sheet) => (
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
                  </div>
                </div>
              )}

              {result.sheetsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Google Sheetsエラー: {result.sheetsError}</AlertDescription>
                </Alert>
              )}

              {/* Google Drive詳細テスト */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Google Drive詳細テスト</h3>
                {result.driveTest.success ? (
                  <div className="bg-green-50 p-4 rounded-md border border-green-200 space-y-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Google Drive接続成功！</span>
                    </div>

                    {result.driveTest.testResults && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(result.driveTest.testResults).map(([key, status]) => {
                          const labels: Record<string, string> = {
                            authTest: "認証テスト",
                            driveApiEnabled: "Drive API有効",
                            folderAccessTest: "フォルダアクセス",
                            folderPermissionsTest: "フォルダ権限",
                            fileUploadTest: "ファイルアップロード",
                            fileDeleteTest: "ファイル削除",
                          }

                          return (
                            <div key={key} className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              <span className="text-sm">{labels[key]}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {result.driveTest.folderInfo && (
                      <div className="border-t pt-3">
                        <div>
                          <span className="text-sm font-medium">フォルダ名:</span>
                          <p className="text-sm">{result.driveTest.folderInfo.name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(result.driveTest.folderInfo!.webViewLink, "_blank")}
                          className="mt-2"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          フォルダを開く
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Google Drive接続失敗</span>
                    </div>
                    {result.driveTest.error && <p className="text-sm text-red-600 mt-2">{result.driveTest.error}</p>}
                  </div>
                )}
              </div>

              {/* フォルダ詳細情報 */}
              {result.folderDetails && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">フォルダ詳細情報</h3>
                  <div className="bg-gray-50 p-4 rounded-md border space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">作成日時:</span>
                        <p>{new Date(result.folderDetails.createdTime).toLocaleString("ja-JP")}</p>
                      </div>
                      <div>
                        <span className="font-medium">更新日時:</span>
                        <p>{new Date(result.folderDetails.modifiedTime).toLocaleString("ja-JP")}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">所有者:</span>
                      <ul className="text-sm mt-1">
                        {result.folderDetails.owners.map((owner, index) => (
                          <li key={index} className="ml-4">
                            • {owner.displayName} ({owner.emailAddress})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 推奨事項 */}
              {result.recommendations && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">推奨事項</h3>
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200 space-y-3">
                    {result.recommendations.useUnifiedCredentials && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium">環境変数の統一を推奨</div>
                          <div className="text-sm mt-1">
                            GOOGLE_SHEETS_CREDENTIALS を GOOGLE_API_CREDENTIALS に統一することで、
                            より効率的な認証管理が可能になります。
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <div className="text-sm font-medium">実装済みの最適化:</div>
                      <ul className="text-sm mt-2 space-y-1">
                        {result.recommendations.apiOptimizations.map((optimization, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {optimization}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={runDiagnosis} disabled={isLoading} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            再診断
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline" className="flex-1">
            トップページに戻る
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
