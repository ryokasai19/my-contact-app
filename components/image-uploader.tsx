"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CameraIcon, UploadIcon, TrashIcon, ImageIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImageUploaderProps {
  onImageSelected: (file: File) => void
  imageFile?: File | null
}

export function ImageUploader({ onImageSelected, imageFile }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // imageFileプロパティが変更されたときにプレビューを更新
  useEffect(() => {
    // 古いプレビューURLをクリーンアップ
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }

    // 新しいファイルがあればプレビューを作成
    if (imageFile && imageFile.size > 0) {
      const url = URL.createObjectURL(imageFile)
      setPreviewUrl(url)

      // ファイルタイプをログに出力（デバッグ用）
      console.log(`Image file selected: ${imageFile.name}, type: ${imageFile.type}, size: ${imageFile.size / 1024} KB`)
    }
  }, [imageFile])

  // コンポーネントのアンマウント時にURLをクリーンアップ
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("画像サイズが大きすぎます (最大5MB)")
      return
    }

    // 画像ファイルかチェック
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください")
      return
    }

    setError(null)

    // ファイル名を修正して拡張子を明示的に追加（必要な場合）
    let fileName = file.name
    if (!fileName.includes(".")) {
      // 拡張子がない場合、MIMEタイプから推測
      const ext = file.type.split("/")[1] || "jpg"
      fileName = `${fileName}.${ext}`
    }

    // 新しいFileオブジェクトを作成（名前を修正）
    try {
      const renamedFile = new File([file], fileName, { type: file.type })
      console.log(`Renamed image file: ${renamedFile.name}, type: ${renamedFile.type}`)

      if (renamedFile.size === 0) {
        setError("ファイルが空です")
        return
      }

      onImageSelected(renamedFile)
    } catch (error) {
      console.error("Error creating file:", error)
      setError("ファイルの処理中にエラーが発生しました")
    }
  }

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ""
    }
    onImageSelected(new Blob() as File)
  }

  return (
    <div className="space-y-4">
      {/* カメラ撮影用のinput */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* ファイル選択用のinput（capture属性なし） */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {!previewUrl ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
          <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 mb-4">名刺または連絡先情報の写真をアップロード</p>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCameraCapture}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <CameraIcon className="h-4 w-4" />
              カメラで撮影
            </Button>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <UploadIcon className="h-4 w-4" />
              ファイルを選択
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img
            src={previewUrl || "/placeholder.svg"}
            alt="Preview"
            className="w-full rounded-lg object-contain max-h-64"
          />
          <Button
            type="button"
            onClick={handleRemoveImage}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
