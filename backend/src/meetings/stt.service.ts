import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SpeechClient } from '@google-cloud/speech'

interface TranscriptResult {
  text: string
  speaker: string | null
  startTime: number | null
  endTime: number | null
}

interface WordInfo {
  word?: string
  startTime?: { seconds?: string | number; nanos?: number }
  endTime?: { seconds?: string | number; nanos?: number }
  speakerTag?: number
}

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name)
  private readonly client: SpeechClient
  private readonly languageCode: string
  private readonly model: string
  private readonly minSpeakerCount: number
  private readonly maxSpeakerCount: number

  constructor(private readonly config: ConfigService) {
    this.client = new SpeechClient()
    this.languageCode = this.config.get<string>('STT_LANGUAGE', 'ko-KR')
    this.model = this.config.get<string>('STT_MODEL', 'latest_long')
    this.minSpeakerCount = Number(
      this.config.get<string>('STT_MIN_SPEAKERS', '2'),
    )
    this.maxSpeakerCount = Number(
      this.config.get<string>('STT_MAX_SPEAKERS', '6'),
    )
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptResult[]> {
    const encoding = this.getEncoding(mimeType)
    const channelCount = this.detectChannelCount(audioBuffer, mimeType)

    // sampleRateHertz 는 의도적으로 생략 — WAV/FLAC/OGG/WEBM 컨테이너는
    // 헤더에 샘플레이트를 담고 있어 Google STT 가 자동 감지함.
    // 명시 값과 헤더 값이 다르면 "sample_rate_hertz mismatch" 로 400을 반환하므로
    // 다양한 입력(44.1k/48k/16k 등)을 안전하게 처리하려면 비워둬야 함.
    //
    // audioChannelCount 는 WAV 헤더에서 직접 읽어 동적으로 전달.
    // 멀티채널일 때 모든 채널을 하나의 트랜스크립트로 합쳐 인식하도록
    // enableSeparateRecognitionPerChannel: false 로 둠 (회의 녹음은 보통 같은 음원).
    const config: Record<string, unknown> = {
      encoding,
      languageCode: this.languageCode,
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true,
      model: this.model,
      // 화자 분리 (Speaker Diarization)
      diarizationConfig: {
        enableSpeakerDiarization: true,
        minSpeakerCount: this.minSpeakerCount,
        maxSpeakerCount: this.maxSpeakerCount,
      },
    }
    if (channelCount && channelCount > 1) {
      config.audioChannelCount = channelCount
      config.enableSeparateRecognitionPerChannel = false
      this.logger.log(`멀티채널 오디오 감지: ${channelCount}ch — 채널 믹스로 인식`)
    }

    const [response] = (await this.client.recognize({
      audio: { content: audioBuffer.toString('base64') },
      config,
    })) as any

    // Speaker diarization은 마지막 result.alternatives[0].words에 모든 단어가 합쳐져 옴
    const results = (response?.results ?? []) as Array<{
      alternatives?: Array<{ transcript?: string; words?: WordInfo[] }>
    }>

    if (results.length === 0) {
      this.logger.log('STT 결과 없음 (무음 또는 인식 실패)')
      return []
    }

    // 마지막 result에 화자 분리 정보가 들어있음
    const lastWords: WordInfo[] = results[results.length - 1]?.alternatives?.[0]?.words ?? []

    if (lastWords.length > 0 && lastWords.some((w) => w.speakerTag !== undefined)) {
      const grouped = this.groupBySpeaker(lastWords)
      this.logger.log(`STT 완료: ${grouped.length}개 세그먼트 (화자 분리)`)
      return grouped
    }

    // Fallback: 화자 분리 없이 result 단위로 묶기
    const fallback: TranscriptResult[] = []
    for (const r of results) {
      const alt = r.alternatives?.[0]
      if (!alt?.transcript) continue
      const words = alt.words ?? []
      fallback.push({
        text: alt.transcript.trim(),
        speaker: null,
        startTime: this.toSeconds(words[0]?.startTime),
        endTime: this.toSeconds(words[words.length - 1]?.endTime),
      })
    }
    this.logger.log(`STT 완료: ${fallback.length}개 세그먼트 (화자 분리 없음)`)
    return fallback
  }

  // 같은 speakerTag로 연속된 단어를 하나의 세그먼트로 묶기
  private groupBySpeaker(words: WordInfo[]): TranscriptResult[] {
    const segments: TranscriptResult[] = []
    let current: { tag: number; words: WordInfo[] } | null = null

    for (const w of words) {
      const tag = w.speakerTag ?? 0
      if (!current || current.tag !== tag) {
        if (current && current.words.length > 0) {
          segments.push(this.buildSegment(current.tag, current.words))
        }
        current = { tag, words: [w] }
      } else {
        current.words.push(w)
      }
    }
    if (current && current.words.length > 0) {
      segments.push(this.buildSegment(current.tag, current.words))
    }
    return segments
  }

  private buildSegment(tag: number, words: WordInfo[]): TranscriptResult {
    const text = words.map((w) => w.word ?? '').join(' ').trim()
    return {
      text,
      speaker: `Speaker ${tag}`,
      startTime: this.toSeconds(words[0]?.startTime),
      endTime: this.toSeconds(words[words.length - 1]?.endTime),
    }
  }

  private toSeconds(t?: { seconds?: string | number; nanos?: number }): number | null {
    if (!t) return null
    const sec = Number(t.seconds ?? 0)
    const nanos = Number(t.nanos ?? 0)
    return sec + nanos / 1e9
  }

  private getEncoding(mimeType: string): any {
    if (mimeType.includes('webm')) return 'WEBM_OPUS'
    if (mimeType.includes('ogg')) return 'OGG_OPUS'
    if (mimeType.includes('flac')) return 'FLAC'
    if (mimeType.includes('wav') || mimeType.includes('wave')) return 'LINEAR16'
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'MP3'
    return 'WEBM_OPUS' // 기본값
  }

  // RIFF/WAVE 헤더에서 NumChannels(offset 22, 16-bit LE) 를 읽어 채널 수 반환.
  // WAV 가 아니거나 헤더가 손상되면 undefined → STT config 에서 audioChannelCount 생략
  // (Google STT 가 컨테이너 메타데이터로 자동 처리).
  private detectChannelCount(buffer: Buffer, mimeType: string): number | undefined {
    const isWav = mimeType.includes('wav') || mimeType.includes('wave')
    if (!isWav || buffer.length < 24) return undefined
    if (buffer.toString('ascii', 0, 4) !== 'RIFF') return undefined
    if (buffer.toString('ascii', 8, 12) !== 'WAVE') return undefined
    const channels = buffer.readUInt16LE(22)
    return channels >= 1 && channels <= 8 ? channels : undefined
  }
}
