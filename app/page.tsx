"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUploader } from "@/components/image-uploader"
import { AudioRecorder } from "@/components/audio-recorder"
import { CompletionModal } from "@/components/completion-modal"
import { submitData } from "@/lib/actions"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setModalOpen] = useState(false)

  // State for the uploaded files
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  // This flag will be used to reset the child components
  const [resetKey, setResetKey] = useState(0)

  const handleFormSubmit = async (formData: FormData) => {
    // Append the files from state to the form data
    if (imageFile) {
      formData.append("image", imageFile)
    }
    if (audioBlob) {
      formData.append("audio", audioBlob)
    }

    setIsLoading(true)
    const result = await submitData(formData)
    setIsLoading(false)

    if (result.success) {
      setModalOpen(true)
    } else {
      // You can use a more sophisticated notification system like a toast
      alert(`Error: ${result.error}`)
    }
  }

  const handleNewInput = () => {
    setModalOpen(false)
    setImageFile(null)
    setAudioBlob(null)
    // Change the key to trigger a reset in the child components
    setResetKey((prevKey) => prevKey + 1)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>名刺・音声データ入力</CardTitle>
          <CardDescription>名刺の写真と補足音声をアップロードして記録します。</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleFormSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">1. 名刺の写真をアップロード</label>
              <ImageUploader key={`image-${resetKey}`} onImageSelected={setImageFile} imageFile={imageFile} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">2. 補足音声を録音</label>
              <AudioRecorder key={`audio-${resetKey}`} onRecorded={setAudioBlob} shouldReset={resetKey > 0} />
            </div>

            <Button type="submit" disabled={isLoading || !imageFile || !audioBlob || audioBlob.size === 0} className="w-full">
              {isLoading ? "処理中..." : "送信"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <CompletionModal isOpen={isModalOpen} onClose={handleNewInput} />
    </main>
  )
}