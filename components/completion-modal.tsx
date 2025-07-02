"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

interface CompletionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CompletionModal({ isOpen, onClose }: CompletionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <DialogTitle className="text-center">送信完了</DialogTitle>
          <DialogDescription className="text-center">
            名刺情報と音声データが正常に処理されました。
            <br />
            スプレッドシートに記録されました。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose}>新しい入力を開始</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
