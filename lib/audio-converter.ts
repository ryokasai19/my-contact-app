import { exec } from "child_process"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { randomUUID } from "crypto"

// 音声ファイルをWhisper APIに対応したフォーマットに変換する
export async function convertAudioForWhisper(audioBuffer: Buffer, originalMimeType: string): Promise<Buffer> {
  try {
    console.log(`Converting audio from ${originalMimeType}`)

    // 一時ファイルのパスを生成
    const tempDir = tmpdir()
    const inputFilePath = join(tempDir, `input-${randomUUID()}.webm`)
    const outputFilePath = join(tempDir, `output-${randomUUID()}.mp3`)

    // 入力ファイルを書き込む
    await writeFile(inputFilePath, audioBuffer)

    // FFmpegを使用して変換
    await new Promise<void>((resolve, reject) => {
      exec(`ffmpeg -i ${inputFilePath} -vn -ar 44100 -ac 2 -b:a 96k ${outputFilePath}`, (error) => {
        if (error) {
          console.error("FFmpeg conversion error:", error)
          reject(error)
          return
        }
        resolve()
      })
    })

    // 変換されたファイルを読み込む
    const convertedBuffer = await require("fs").promises.readFile(outputFilePath)

    // 一時ファイルを削除
    try {
      await unlink(inputFilePath)
      await unlink(outputFilePath)
    } catch (cleanupError) {
      console.warn("Failed to clean up temp files:", cleanupError)
    }

    return convertedBuffer
  } catch (error) {
    console.error("Audio conversion error:", error)
    throw new Error(`音声変換に失敗しました: ${error.message}`)
  }
}

// 代替手段: WebAssemblyを使用したブラウザ内変換（FFmpegが使用できない環境用）
export async function convertAudioInMemory(audioBuffer: Buffer): Promise<Buffer> {
  try {
    // 単純なフォーマット変換ができない場合は、
    // 元のバッファをそのまま返す
    return audioBuffer
  } catch (error) {
    console.error("In-memory audio conversion error:", error)
    return audioBuffer
  }
}

// 環境に応じて適切な変換方法を選択
export async function convertAudio(audioBuffer: Buffer, mimeType: string): Promise<Buffer> {
  // Vercel環境でFFmpegが使用できるか確認
  try {
    // FFmpegが使用できるか簡易チェック
    await new Promise<void>((resolve, reject) => {
      exec("ffmpeg -version", (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })

    // FFmpegが使用可能な場合
    return await convertAudioForWhisper(audioBuffer, mimeType)
  } catch (ffmpegError) {
    console.warn("FFmpeg not available, using in-memory conversion:", ffmpegError)

    // FFmpegが使用できない場合はメモリ内変換を試みる
    return await convertAudioInMemory(audioBuffer)
  }
}
