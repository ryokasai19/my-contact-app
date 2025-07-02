"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, Copy, ExternalLink, RefreshCw, AlertTriangle, Info } from "lucide-react"

interface DriveTestResult {
  success: boolean
  timestamp: string
  serviceAccountEmail: string
  projectId: string
  folderId: string
  testResults: {
    authTest: boolean
    driveApiTest: boolean
    folderExistsTest: boolean
    folderPermissionsTest: boolean
    createFileTest: boolean
  }
  detailedInfo: {
    scopes?: string[]
    credentialsInfo?: {
      hasPrivateKey: boolean
      privateKeyLength: number
      hasClientEmail: boolean
      hasProjectId: boolean
    }
    authInfo?: {
      hasAccessToken: boolean
      tokenType: string
    }
    driveApiError?: {
      message: string
      code?: number
      diagnosis?: string
      solution?: string
      actionRequired?: string
      priority?: string
      currentScopes?: string[]
    }
    folderInfo?: {
      id: string
      name: string
      webViewLink: string
      owners: any[]
      capabilities?: any
    }
    folderError?: {
      message: string
      code?: number
      diagnosis?: string
      serviceAccount?: string
      actionRequired?: string
      folderUrl?: string
      priority?: string
    }
    permissions?: {
      all: any[]
      serviceAccount?: any
      hasPermission: boolean
      totalCount: number
    }
    permissionsError?: {
      message: string
      actionRequired: string
      priority?: string
    }
    fileTestResult?: {
      success: boolean
      fileId: string
      webViewLink: string
      fileName: string
      fileSize: string
      sharedDriveSupport: boolean
    }
    fileTestError?: {
      message: string
      code?: number
      actionRequired?: string
    }
  }
  error?: string
  enhancedDiagnostics?: boolean
}

export default function DriveDiagnosisPage() {
  const [result, setResult] = useState<DriveTestResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const runDiagnosis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/check-drive-api")
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

  const getPriorityIcon = (priority?: string) => {
    if (priority === "HIGH") {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    return <Info className="h-4 w-4 text-blue-500" />
  }

  // Google Drive API有効化リンクを生成
  const getDriveApiEnableUrl = (projectId: string) => {
    return `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${projectId}`
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle className="text-xl">Google Drive API 診断 (強化版)</CardTitle>
          <CardDescription>Google Drive連携の詳細な診断を行います</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Google Drive API詳細診断を実行中...
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : result ? (
            <>
              {/* 基本情報 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">基本情報</h3>
                <div className="bg-gray-50 p-4 rounded-md border space-y-2">
                  <div className="text-xs text-gray-500">
                    診断実行時刻: {new Date(result.timestamp).toLocaleString("ja-JP")}
                    {result.enhancedDiagnostics && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">強化診断</span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium">サービスアカウント:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono bg-white p-2 rounded border flex-1">
                        {result.serviceAccountEmail}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.serviceAccountEmail)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">プロジェクトID:</span>
                    <p className="text-sm font-mono">{result.projectId}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">フォルダID:</span>
                    <p className="text-sm font-mono">{result.folderId}</p>
                  </div>
                </div>
              </div>

              {/* 認証情報詳細 */}
              {result.detailedInfo.credentialsInfo && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">認証情報詳細</h3>
                  <div className="bg-gray-50 p-4 rounded-md border space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.detailedInfo.credentialsInfo.hasPrivateKey)}
                        <span>秘密鍵: {result.detailedInfo.credentialsInfo.hasPrivateKey ? "あり" : "なし"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.detailedInfo.credentialsInfo.hasClientEmail)}
                        <span>
                          クライアントメール: {result.detailedInfo.credentialsInfo.hasClientEmail ? "あり" : "なし"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.detailedInfo.credentialsInfo.hasProjectId)}
                        <span>
                          プロジェクトID: {result.detailedInfo.credentialsInfo.hasProjectId ? "あり" : "なし"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        秘密鍵長: {result.detailedInfo.credentialsInfo.privateKeyLength} 文字
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 認証スコープ */}
              {result.detailedInfo.scopes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">認証スコープ</h3>
                  <div className="bg-gray-50 p-4 rounded-md border">
                    <div className="space-y-1">
                      {result.detailedInfo.scopes.map((scope, index) => (
                        <div key={index} className="text-xs font-mono bg-white p-1 rounded">
                          {scope}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* テスト結果 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">テスト結果</h3>
                <div className="bg-gray-50 p-4 rounded-md border space-y-3">
                  {Object.entries(result.testResults).map(([key, status]) => {
                    const labels: Record<string, string> = {
                      authTest: "認証テスト",
                      driveApiTest: "Drive API利用可能性",
                      folderExistsTest: "フォルダ存在確認",
                      folderPermissionsTest: "フォルダ権限確認",
                      createFileTest: "ファイル作成テスト",
                    }

                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm">{labels[key]}:</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <span className="text-sm">{status ? "成功" : "失敗"}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Drive API未有効化の場合の警告 */}
              {result.testResults.authTest && !result.testResults.driveApiTest && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="font-medium">Google Drive APIが有効化されていません</div>
                      <div className="text-sm">
                        認証は成功していますが、Google Drive APIが利用できません。
                        これは最も一般的な問題で、APIを有効化することで解決できます。
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-medium">解決方法:</div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.open(getDriveApiEnableUrl(result.projectId), "_blank")}
                          className="w-fit"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Google Drive API を有効化
                        </Button>
                        <div className="text-xs text-gray-600 mt-1">
                          ↑ このボタンをクリックしてGoogle Drive APIを有効化してください
                        </div>
                        <div className="text-xs text-gray-600">
                          有効化後、数分待ってから「再診断」ボタンをクリックしてください
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Drive API エラー詳細 */}
              {result.detailedInfo.driveApiError && (
                <Alert variant="destructive">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(result.detailedInfo.driveApiError.priority)}
                    <span className="font-medium">Google Drive API エラー</span>
                    {result.detailedInfo.driveApiError.priority === "HIGH" && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">高優先度</span>
                    )}
                  </div>
                  <AlertDescription>
                    <div className="space-y-3 mt-2">
                      <div className="text-sm">{result.detailedInfo.driveApiError.message}</div>

                      {result.detailedInfo.driveApiError.diagnosis && (
                        <div className="text-sm">
                          <strong>診断:</strong> {result.detailedInfo.driveApiError.diagnosis}
                        </div>
                      )}

                      {result.detailedInfo.driveApiError.actionRequired && (
                        <div className="text-sm">
                          <strong>必要な対応:</strong> {result.detailedInfo.driveApiError.actionRequired}
                        </div>
                      )}

                      {result.detailedInfo.driveApiError.solution && (
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-medium">解決方法:</div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.open(result.detailedInfo.driveApiError!.solution, "_blank")}
                            className="w-fit"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Google Drive API を有効化
                          </Button>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* フォルダエラー詳細 */}
              {result.detailedInfo.folderError && (
                <Alert variant="destructive">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(result.detailedInfo.folderError.priority)}
                    <span className="font-medium">フォルダアクセス エラー</span>
                  </div>
                  <AlertDescription>
                    <div className="space-y-3 mt-2">
                      <div className="text-sm">{result.detailedInfo.folderError.message}</div>

                      {result.detailedInfo.folderError.diagnosis && (
                        <div className="text-sm">
                          <strong>診断:</strong> {result.detailedInfo.folderError.diagnosis}
                        </div>
                      )}

                      {result.detailedInfo.folderError.actionRequired && (
                        <div className="text-sm">
                          <strong>必要な対応:</strong> {result.detailedInfo.folderError.actionRequired}
                        </div>
                      )}

                      {result.detailedInfo.folderError.serviceAccount && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">追加するメールアドレス:</div>
                          <div className="flex items-center gap-2">
                            <code className="bg-white p-2 rounded text-xs flex-1">
                              {result.detailedInfo.folderError.serviceAccount}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(result.detailedInfo.folderError!.serviceAccount!)}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>

                          {result.detailedInfo.folderError.folderUrl && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => window.open(result.detailedInfo.folderError!.folderUrl, "_blank")}
                              className="w-fit"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              フォルダの共有設定を開く
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* 権限エラー詳細 */}
              {result.detailedInfo.permissionsError && (
                <Alert variant="destructive">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(result.detailedInfo.permissionsError.priority)}
                    <span className="font-medium">権限エラー</span>
                  </div>
                  <AlertDescription>
                    <div className="space-y-2 mt-2">
                      <div className="text-sm">{result.detailedInfo.permissionsError.message}</div>
                      <div className="text-sm">
                        <strong>必要な対応:</strong> {result.detailedInfo.permissionsError.actionRequired}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* フォルダ情報 */}
              {result.detailedInfo.folderInfo && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">フォルダ情報</h3>
                  <div className="bg-green-50 p-4 rounded-md border border-green-200 space-y-2">
                    <div>
                      <span className="text-sm font-medium">フォルダ名:</span>
                      <p className="text-sm">{result.detailedInfo.folderInfo.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">フォルダID:</span>
                      <p className="text-sm font-mono">{result.detailedInfo.folderInfo.id}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(result.detailedInfo.folderInfo!.webViewLink, "_blank")}
                      className="mt-2"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      フォルダを開く
                    </Button>
                  </div>
                </div>
              )}

              {/* 権限詳細 */}
              {result.detailedInfo.permissions && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">フォルダ権限詳細</h3>
                  <div className="bg-gray-50 p-4 rounded-md border space-y-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.detailedInfo.permissions.hasPermission)}
                      <span className="text-sm font-medium">
                        サービスアカウント権限: {result.detailedInfo.permissions.hasPermission ? "あり" : "なし"}
                      </span>
                    </div>

                    {result.detailedInfo.permissions.serviceAccount && (
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium">サービスアカウント権限詳細:</div>
                        <div className="text-xs mt-1">
                          <div>役割: {result.detailedInfo.permissions.serviceAccount.role}</div>
                          <div>タイプ: {result.detailedInfo.permissions.serviceAccount.type}</div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-medium">
                        全権限一覧 ({result.detailedInfo.permissions.totalCount}件):
                      </div>
                      <div className="max-h-32 overflow-y-auto mt-2 space-y-1">
                        {result.detailedInfo.permissions.all.map((perm, index) => (
                          <div key={index} className="text-xs bg-white p-2 rounded border">
                            <div>
                              {perm.emailAddress || perm.displayName || "匿名"} - {perm.role} ({perm.type})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ファイルテスト結果 */}
              {result.detailedInfo.fileTestResult && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">ファイル作成テスト結果</h3>
                  <div className="bg-green-50 p-4 rounded-md border border-green-200 space-y-2">
                    <div className="text-sm">
                      <strong>ファイル名:</strong> {result.detailedInfo.fileTestResult.fileName}
                    </div>
                    <div className="text-sm">
                      <strong>ファイルサイズ:</strong> {result.detailedInfo.fileTestResult.fileSize} bytes
                    </div>
                    <div className="text-sm">
                      <strong>Shared Drive対応:</strong>{" "}
                      {result.detailedInfo.fileTestResult.sharedDriveSupport ? "有効" : "無効"}
                    </div>
                  </div>
                </div>
              )}

              {/* 成功メッセージ */}
              {result.success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium text-green-800">Google Drive連携が正常に動作しています！</div>
                    <div className="text-sm text-green-700 mt-1">
                      すべてのテストが成功しました。ファイルのアップロードが可能です。
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* 手動API有効化の案内 */}
              {!result.success && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">手動でGoogle Drive APIを有効化する方法</div>
                      <div className="text-sm">
                        1. 上記の「Google Drive API を有効化」ボタンをクリック
                        <br />
                        2. Google Cloud Consoleで「有効にする」をクリック
                        <br />
                        3. 数分待ってから「再診断」ボタンをクリック
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : null}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={runDiagnosis} disabled={isLoading} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            再診断
          </Button>
          {result && !result.success && (
            <Button
              onClick={() => window.open(getDriveApiEnableUrl(result.projectId), "_blank")}
              variant="default"
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Drive API有効化
            </Button>
          )}
          <Button onClick={() => (window.location.href = "/")} variant="outline" className="flex-1">
            トップページに戻る
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
