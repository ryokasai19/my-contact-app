"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MicIcon, MonitorStopIcon as StopIcon, PlayIcon, PauseIcon, TrashIcon, AlertCircleIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AudioRecorderProps {
  onRecorded: (blob: Blob) => void
  shouldReset?: boolean // リセットフラグを追加
}

export function AudioRecorder({ onRecorded, shouldReset }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingComplete, setRecordingComplete] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioSize, setAudioSize] = useState(0)
  const [showSizeWarning, setShowSizeWarning] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [recordingFormat, setRecordingFormat] = useState<string>("audio/webm")
  const [debugInfo, setDebugInfo] = useState<string>("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check if device is iOS
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIOSDevice)

    // iOSではMP4またはMP3フォーマットを使用
    if (isIOSDevice) {
      setRecordingFormat("audio/mp4")
    }
  }, [])

  // shouldResetが変更されたときにリセット処理を実行
  useEffect(() => {
    if (shouldReset) {
      deleteRecording()
    }
  }, [shouldReset])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setPermissionDenied(false)
      setDebugInfo("")

      // Request audio permission with better error handling
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        streamRef.current = stream
      } catch (permissionError) {
        console.error("Microphone permission error:", permissionError)
        setDebugInfo(
          `Microphone permission error: ${permissionError instanceof Error ? permissionError.message : String(permissionError)}`,
        )

        // Check if it's a permission error
        if (
          permissionError instanceof DOMException &&
          (permissionError.name === "NotAllowedError" || permissionError.name === "PermissionDeniedError")
        ) {
          setPermissionDenied(true)
          throw new Error("マイクへのアクセスが拒否されました。ブラウザの設定でマイクへのアクセスを許可してください。")
        } else {
          throw permissionError
        }
      }

      // Determine if MediaRecorder is available and what options to use
      let options: MediaRecorderOptions = {}
      let selectedFormat = recordingFormat

      if (isIOS) {
        // iOS Safari supports these formats
        if (MediaRecorder.isTypeSupported("audio/mp3")) {
          options = { mimeType: "audio/mp3" }
          selectedFormat = "audio/mp3"
        } else {
          // Use default for iOS
          options = {}
          selectedFormat = "audio/mp4"
        }
      } else {
        // For other browsers, prefer WebM with Opus codec
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = {
            mimeType: "audio/webm;codecs=opus",
          }
          selectedFormat = "audio/webm"
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = {
            mimeType: "audio/webm",
          }
          selectedFormat = "audio/webm"
        } else if (MediaRecorder.isTypeSupported("audio/mp3")) {
          options = { mimeType: "audio/mp3" }
          selectedFormat = "audio/mp3"
        } else {
          // Use default
          options = {}
          selectedFormat = "audio/webm"
        }
      }

      setRecordingFormat(selectedFormat)
      const debugMsg = `Using MediaRecorder with options: ${JSON.stringify(options)}, Format: ${selectedFormat}`
      console.log(debugMsg)
      setDebugInfo(debugMsg)

      const mediaRecorder = new MediaRecorder(streamRef.current, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingDuration(0)
      setShowSizeWarning(false)

      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          // 5分（300秒）を超えたら自動的に停止
          if (prev >= 300) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current)
        }

        if (audioChunksRef.current.length === 0) {
          console.error("No audio data collected")
          setDebugInfo("No audio data collected")
          return
        }

        // 録音フォーマットを使用
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedFormat })
        const audioUrl = URL.createObjectURL(audioBlob)
        const size = audioBlob.size / 1024 // KB

        setAudioSize(size)

        // Show warning if file is large
        if (size > 1000) {
          setShowSizeWarning(true)
        }

        if (audioRef.current) {
          audioRef.current.src = audioUrl
        }

        audioUrlRef.current = audioUrl
        setRecordingComplete(true)

        // ファイル名を明示的に設定
        let fileName = "recording.webm"

        // 適切な拡張子を設定
        if (selectedFormat.includes("mp3")) {
          fileName = "recording.mp3"
        } else if (selectedFormat.includes("mp4")) {
          fileName = "recording.mp4"
        } else if (selectedFormat.includes("mpeg")) {
          fileName = "recording.mp3"
        }

        const file = new File([audioBlob], fileName, { type: selectedFormat })

        const debugMsg = `Recording completed: ${size.toFixed(1)}KB, type: ${selectedFormat}, filename: ${fileName}`
        console.log(debugMsg)
        setDebugInfo(debugMsg)

        onRecorded(file)
      }

      // For iOS, we need to request data more frequently
      const timeSlice = isIOS ? 1000 : 100 // 1 second for iOS, 100ms for others
      mediaRecorder.start(timeSlice)
      setIsRecording(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setDebugInfo(`Error accessing microphone: ${error instanceof Error ? error.message : String(error)}`)

      // Check if it's a permission error
      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
      ) {
        setPermissionDenied(true)
      } else {
        alert("マイクへのアクセスに失敗しました。ブラウザの設定を確認してください。")
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop()

        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }

        setIsRecording(false)
      } catch (error) {
        console.error("Error stopping recording:", error)
        setDebugInfo(`Error stopping recording: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  const playRecording = () => {
    if (audioRef.current && recordingComplete) {
      audioRef.current.play().catch((err) => {
        console.error("Error playing audio:", err)
        setDebugInfo(`Error playing audio: ${err instanceof Error ? err.message : String(err)}`)
      })
      setIsPlaying(true)

      audioRef.current.onended = () => {
        setIsPlaying(false)
      }
    }
  }

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const deleteRecording = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }

    if (audioRef.current) {
      audioRef.current.src = ""
    }

    // Stop recording if it's in progress
    if (isRecording && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }
      } catch (error) {
        console.error("Error stopping active recording:", error)
        setDebugInfo(`Error stopping active recording: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Clear all state
    audioChunksRef.current = []
    setRecordingComplete(false)
    setIsPlaying(false)
    setIsRecording(false)
    setRecordingDuration(0)
    setAudioSize(0)
    setShowSizeWarning(false)
    setDebugInfo("")

    // Notify parent component
    onRecorded(new Blob())
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-2">
      <audio ref={audioRef} className="hidden" controls />

      <div className="flex flex-wrap gap-2">
        {!isRecording && !recordingComplete && (
          <Button
            type="button"
            onClick={startRecording}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <MicIcon className="h-4 w-4" />
            録音開始
          </Button>
        )}

        {isRecording && (
          <>
            <Button
              type="button"
              onClick={stopRecording}
              variant="destructive"
              size="sm"
              className="flex items-center gap-1"
            >
              <StopIcon className="h-4 w-4" />
              録音停止
            </Button>
            <span className="text-sm text-muted-foreground flex items-center">{formatTime(recordingDuration)}</span>
          </>
        )}

        {recordingComplete && !isPlaying && (
          <Button type="button" onClick={playRecording} variant="outline" size="sm" className="flex items-center gap-1">
            <PlayIcon className="h-4 w-4" />
            再生
          </Button>
        )}

        {recordingComplete && isPlaying && (
          <Button
            type="button"
            onClick={pauseRecording}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <PauseIcon className="h-4 w-4" />
            一時停止
          </Button>
        )}

        {recordingComplete && (
          <Button
            type="button"
            onClick={deleteRecording}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-red-500"
          >
            <TrashIcon className="h-4 w-4" />
            削除
          </Button>
        )}
      </div>

      {recordingComplete && (
        <div className="text-sm text-muted-foreground">
          録音時間: {formatTime(recordingDuration)} ({audioSize.toFixed(1)} KB) - 形式: {recordingFormat}
        </div>
      )}

      {permissionDenied && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>
            マイクへのアクセスが拒否されました。ブラウザの設定でマイクへのアクセスを許可してください。
          </AlertDescription>
        </Alert>
      )}

      {showSizeWarning && (
        <Alert variant="warning" className="bg-amber-50 text-amber-800 border-amber-200 mt-2">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>録音サイズが大きいため、処理に時間がかかる場合があります。</AlertDescription>
        </Alert>
      )}

      {isIOS && (
        <div className="text-xs text-muted-foreground mt-1">
          iOSデバイスでは、マイクへのアクセス許可を求められます。「許可」を選択してください。
        </div>
      )}

      {debugInfo && (
        <div className="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded border border-blue-200 overflow-auto max-h-20">
          <strong>デバッグ情報:</strong> {debugInfo}
        </div>
      )}
    </div>
  )
}
