// クライアントサイドでの音声変換ユーティリティ

/**
 * 音声ファイルをWAVに変換する
 * @param audioBlob 元の音声Blob
 * @returns 変換後のWAV形式のBlob
 */
export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // AudioContextを作成
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContext()

      // FileReaderでBlobを読み込む
      const fileReader = new FileReader()
      fileReader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer

          // 音声データをデコード
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

          // WAVに変換
          const wavBlob = await audioBufferToWav(audioBuffer)
          resolve(wavBlob)
        } catch (decodeError) {
          console.error("Audio decoding error:", decodeError)
          // デコードに失敗した場合は元のBlobを返す
          resolve(audioBlob)
        }
      }

      fileReader.onerror = (error) => {
        console.error("FileReader error:", error)
        reject(error)
      }

      fileReader.readAsArrayBuffer(audioBlob)
    } catch (error) {
      console.error("Error in convertToWav:", error)
      // エラーが発生した場合は元のBlobを返す
      resolve(audioBlob)
    }
  })
}

/**
 * AudioBufferからWAV形式のBlobを生成する
 * @param audioBuffer デコードされた音声データ
 * @returns WAV形式のBlob
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve) => {
    const numOfChannels = audioBuffer.numberOfChannels
    const length = audioBuffer.length * numOfChannels * 2
    const sampleRate = audioBuffer.sampleRate

    // WAVヘッダーのサイズを含めたバッファを作成
    const buffer = new ArrayBuffer(44 + length)
    const view = new DataView(buffer)

    // WAVヘッダーを書き込む
    // "RIFF"
    writeString(view, 0, "RIFF")
    // ファイルサイズ
    view.setUint32(4, 36 + length, true)
    // "WAVE"
    writeString(view, 8, "WAVE")
    // "fmt "チャンク
    writeString(view, 12, "fmt ")
    // fmtチャンクのサイズ
    view.setUint32(16, 16, true)
    // フォーマットタイプ（1はPCM）
    view.setUint16(20, 1, true)
    // チャンネル数
    view.setUint16(22, numOfChannels, true)
    // サンプルレート
    view.setUint32(24, sampleRate, true)
    // バイトレート
    view.setUint32(28, sampleRate * numOfChannels * 2, true)
    // ブロックサイズ
    view.setUint16(32, numOfChannels * 2, true)
    // ビット深度
    view.setUint16(34, 16, true)
    // "data"チャンク
    writeString(view, 36, "data")
    // データサイズ
    view.setUint32(40, length, true)

    // 音声データを書き込む
    const channels = []
    for (let i = 0; i < numOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }

    let offset = 44
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numOfChannels; channel++) {
        // 32ビット浮動小数点を16ビット整数に変換
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        view.setInt16(offset, value, true)
        offset += 2
      }
    }

    // WAV形式のBlobを作成
    const wavBlob = new Blob([buffer], { type: "audio/wav" })
    resolve(wavBlob)
  })
}

/**
 * DataViewに文字列を書き込む
 */
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
