"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, Copy } from "lucide-react"

interface CredentialsInfo {
  clientEmail: string
  projectId: string
  privateKeyId: string
}

interface DriveStatus {
  isConfigured: boolean
  folderExists: boolean
  folderName?: string
  errorMessage?: string
}

export default function DiagnosePage() {
  const [credentials, setCredentials] = useState<CredentialsInfo | null>(null)
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDiagnostics() {
      setIsLoading(true)
      setError(null)

      try {
        // 認証情報を取得
        const credResponse = await fetch("/api/check-credentials")
        if (!credResponse.ok) {
          throw new Error("Failed to fetch credentials info")
        }
        const credData = await credResponse.json()
        setCredentials(credData)

        // Google Drive設定を確認
        const driveResponse = await fetch("/api/check-drive")
        if (!driveResponse.ok) {
          throw new Error("Failed to fetch drive status")
        }
        const driveData = await driveResponse.json()
        setDriveStatus(driveData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "診断中にエラーが発生しました")
      } finally {
        setIsLoading(false)
      }
    }

    loadDiagnostics()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("クリップボードにコピーしました"))
      .catch((err) => console.error("コピーに失敗しました:", err))
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">システム診断</CardTitle>
          <CardDescription>Google Drive連携の設定状況を確認します</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                診断情報を取得中...
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">サービスアカウント情報</h3>
                {credentials ? (
                  <div className="bg-gray-50 p-4 rounded-md border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">メールアドレス:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(credentials.clientEmail)}
                        className="h-6 px-2"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        <span className="text-xs">コピー</span>
                      </Button>
                    </div>
                    <p className="text-sm break-all mb-4">{credentials.clientEmail}</p>

                    <p className="text-sm mb-1">
                      <span className="font-medium">プロジェクトID:</span> {credentials.projectId}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">キーID:</span> {credentials.privateKeyId}
                    </p>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>サービスアカウント情報を取得できませんでした</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Google Drive設定</h3>
                {driveStatus ? (
                  driveStatus.folderExists ? (
                    <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        フォルダへのアクセス: 正常
                        {driveStatus.folderName && ` (フォルダ名: ${driveStatus.folderName})`}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{driveStatus.errorMessage || "フォルダにアクセスできません"}</AlertDescription>
                    </Alert>
                  )
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Google Drive設定を確認できませんでした</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">環境変数</h3>
                <div className="bg-gray-50 p-4 rounded-md border">
                  <p className="text-sm mb-2">
                    <span className="font-medium">GOOGLE_DRIVE_FOLDER_ID:</span>{" "}
                    {process.env.NEXT_PUBLIC_FOLDER_ID || "設定されていません"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">API Keys:</span> {process.env.OPENAI_API_KEY ? "設定済み" : "未設定"}
                  </p>
                </div>
              </div>
            </>
          )}
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
