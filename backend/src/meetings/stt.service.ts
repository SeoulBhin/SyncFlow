import { Injectable, Logger } from '@nestjs/common'
import { SpeechClient } from '@google-cloud/speech'

interface TranscriptResult {
  text: string
  speaker: string | null
  startTime: number | null
  endTime: number | null
}

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name)
  private client: SpeechClient

  constructor() {
    this.client = new SpeechClient()
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptResult[]> {
    const encoding = this.getEncoding(mimeType)

    const responses = await (this.client.recognize({
      audio: { content: audioBuffer.toString('base64') },
      config: {
        encoding,
        sampleRateHertz: 16000,
        languageCode: 'ko-KR',
        enableWordTimeOffsets: true,
      },
    }) as unknown as Promise<any[]>)

    const response = responses[0]
    const results: TranscriptResult[] = []

    for (const result of response?.results ?? []) {
      const alt = result.alternatives?.[0]
      if (!alt?.transcript) continue

      results.push({
        text: alt.transcript,
        speaker: null,
        startTime: Number(alt.words?.[0]?.startTime?.seconds ?? 0),
        endTime: Number(alt.words?.at(-1)?.endTime?.seconds ?? 0),
      })
    }

    this.logger.log(`STT 완료: ${results.length}개 세그먼트`)
    return results
  }

  private getEncoding(mimeType: string): any {
    if (mimeType.includes('webm')) return 'WEBM_OPUS'
    if (mimeType.includes('ogg')) return 'OGG_OPUS'
    if (mimeType.includes('flac')) return 'FLAC'
    if (mimeType.includes('wav')) return 'LINEAR16'
    return 'WEBM_OPUS' // 기본값
  }
}
