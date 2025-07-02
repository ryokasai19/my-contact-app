"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { ImageUploader } from "@/components/image-uploader"
import { AudioRecorder } from "@/components/audio-recorder"
import { CompletionModal } from "@/components/completion-modal"
import { submitData } from "@/lib/actions"
import { Loader2 } from "lucide-react"

// Define a schema for file uploads using Zod
const formSchema = z.object({
  image: z
    .instanceof(File, { message: "画像ファイルを選択してください。" })
    .refine((file) => file.size > 0, "画像ファイルは必須です。"),
  audio: z
    .instanceof(Blob, { message: "音声ファイルを録音してください。" })
    .refine((blob) => blob.size > 0, "音声ファイルは必須です。"),
})

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setModalOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      image: new File([], ""),
      audio: new Blob(),
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    toast.info("データを処理中...", {
      description: "完了までしばらくお待ちください。",
    })

    const formData = new FormData()
    formData.append("image", values.image)
    formData.append("audio", values.audio)

    const result = await submitData(formData)

    setIsLoading(false)

    if (result.success) {
      toast.success("処理が完了しました！")
      setModalOpen(true)
    } else {
      toast.error("エラーが発生しました", {
        description: result.error,
      })
    }
  }

  const handleNewInput = () => {
    setModalOpen(false)
    form.reset()
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>1. 名刺の写真をアップロード</FormLabel>
                    <FormControl>
                      <ImageUploader
                        key={`image-${resetKey}`}
                        onImageSelected={(file) => field.onChange(file)}
                        imageFile={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>2. 補足音声を録音</FormLabel>
                    <FormControl>
                      <AudioRecorder
                        key={`audio-${resetKey}`}
                        onRecorded={(blob) => field.onChange(blob)}
                        shouldReset={resetKey > 0 && form.formState.isSubmitSuccessful}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  "送信"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <CompletionModal isOpen={isModalOpen} onClose={handleNewInput} />
    </main>
  )
}
