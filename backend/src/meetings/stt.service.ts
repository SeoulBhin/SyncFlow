import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SpeechClient } from '@google-cloud/speech'
import type { Duplex } from 'stream'

// Google 서비스 계정 JSON에서 SpeechClient가 실제로 사용하는 필드만 추림.
// 다른 필드(project_id, client_email 등)는 SDK 가 무시해도 무방하지만 그대로 전달.
interface ServiceAccountCredentials {
  client_email: string
  private_key: string
  [k: string]: unknown
}

export interface TranscriptResult {
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
    // 인증 전략: GOOGLE_STT_KEY_JSON (서비스 계정 JSON 전체를 문자열로 .env 에 저장).
    // 로컬 파일 경로(GOOGLE_APPLICATION_CREDENTIALS) 사용 시 OS·환경별 경로 문제,
    // CI/배포 환경에서 키 파일 누락 등 휴먼 에러가 잦아서 단일 env 로 일원화.
    this.client = this.createSpeechClient()
    this.languageCode = this.config.get<string>('STT_LANGUAGE', 'ko-KR')
    this.model = this.config.get<string>('STT_MODEL', 'latest_long')
    this.minSpeakerCount = Number(
      this.config.get<string>('STT_MIN_SPEAKERS', '2'),
    )
    this.maxSpeakerCount = Number(
      this.config.get<string>('STT_MAX_SPEAKERS', '6'),
    )
  }

  // GOOGLE_STT_KEY_JSON 문자열을 파싱해 SpeechClient 를 생성.
  // private_key 의 이스케이프된 \\n 을 실제 개행으로 변환해야 PEM 파싱 성공.
  private createSpeechClient(): SpeechClient {
    // 진단: 두 가지 변수명 모두 점검 (사용자가 옛 이름에 JSON을 넣어둔 케이스 대응)
    const primary = this.config.get<string>('GOOGLE_STT_KEY_JSON', '')?.trim()
    const legacy = this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS', '')?.trim()

    this.logger.log(
      `[STT 인증 점검] GOOGLE_STT_KEY_JSON exists=${!!primary} (len=${primary?.length ?? 0}), ` +
      `GOOGLE_APPLICATION_CREDENTIALS exists=${!!legacy} (len=${legacy?.length ?? 0})`,
    )

    // 우선순위: GOOGLE_STT_KEY_JSON > GOOGLE_APPLICATION_CREDENTIALS(값이 JSON 형태일 때만)
    let raw = primary
    if (!raw && legacy && legacy.startsWith('{')) {
      this.logger.warn(
        'GOOGLE_STT_KEY_JSON 이 비어 있습니다. GOOGLE_APPLICATION_CREDENTIALS 의 JSON 문자열을 fallback 으로 사용합니다. ' +
        '권장: .env 변수명을 GOOGLE_STT_KEY_JSON 으로 변경하세요.',
      )
      raw = legacy
    }

    if (!raw) {
      this.logger.error(
        'GOOGLE_STT_KEY_JSON 이 .env 에 없습니다. 서비스 계정 JSON 전체를 한 줄 문자열로 넣어주세요. ' +
        `(GOOGLE_APPLICATION_CREDENTIALS fallback 도 사용 불가: legacy="${legacy?.slice(0, 30) ?? ''}…")`,
      )
      throw new InternalServerErrorException(
        'STT Auth Key string is missing in .env',
      )
    }

    let parsed: ServiceAccountCredentials
    try {
      parsed = JSON.parse(raw) as ServiceAccountCredentials
    } catch (err) {
      this.logger.error(
        `GOOGLE_STT_KEY_JSON 파싱 실패: ${(err as Error).message}`,
      )
      throw new InternalServerErrorException(
        'STT Auth Key string is missing in .env',
      )
    }

    if (!parsed.client_email || !parsed.private_key) {
      this.logger.error(
        'GOOGLE_STT_KEY_JSON 에 client_email 또는 private_key 가 없습니다.',
      )
      throw new InternalServerErrorException(
        'STT Auth Key string is missing in .env',
      )
    }

    // .env 한 줄로 저장된 JSON 의 private_key 는 개행이 \\n 으로 이스케이프됨.
    // PEM 파서는 실제 \n 개행을 요구하므로 변환 필요.
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')

    this.logger.log(
      `STT 인증: client_email="${parsed.client_email}" (private_key len=${parsed.private_key.length})`,
    )

    return new SpeechClient({ credentials: parsed })
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    speakerMap?: Record<string, string>,
  ): Promise<TranscriptResult[]> {
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
      const grouped = this.groupBySpeaker(lastWords, speakerMap)
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
  private groupBySpeaker(
    words: WordInfo[],
    speakerMap?: Record<string, string>,
  ): TranscriptResult[] {
    const segments: TranscriptResult[] = []
    let current: { tag: number; words: WordInfo[] } | null = null

    for (const w of words) {
      const tag = w.speakerTag ?? 0
      if (!current || current.tag !== tag) {
        if (current && current.words.length > 0) {
          segments.push(this.buildSegment(current.tag, current.words, speakerMap))
        }
        current = { tag, words: [w] }
      } else {
        current.words.push(w)
      }
    }
    if (current && current.words.length > 0) {
      segments.push(this.buildSegment(current.tag, current.words, speakerMap))
    }
    return segments
  }

  private buildSegment(
    tag: number,
    words: WordInfo[],
    speakerMap?: Record<string, string>,
  ): TranscriptResult {
    const text = words.map((w) => w.word ?? '').join(' ').trim()
    const speaker = speakerMap?.[String(tag)] ?? `Speaker ${tag}`
    return {
      text,
      speaker,
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

  // 실시간 STT 스트리밍 세션 생성 — Google STT StreamingRecognize API 사용.
  // 반환된 Duplex 스트림에 audio chunk Buffer를 write()하면 onResult 콜백이 호출됨.
  // 스트림 수명은 Google STT 제한(약 5분)에 따르며, Gateway에서 세션 단위로 관리함.
  // Google이 스트림을 끊는 경우 (5분 한도, 인증 오류, 오디오 무음 60초 등)에는
  // recognizeStream.on('error') / on('end') / on('close') 가 발생하므로
  // 호출자(Gateway)가 그 이벤트를 받아 재생성해야 함.
  createStreamingSession(onResult: (result: TranscriptResult) => void): Duplex {
    const recognizeStream: Duplex = this.client.streamingRecognize({
      config: {
        encoding: 'WEBM_OPUS' as any,
        // WebM/Opus 컨테이너는 보통 48kHz. MediaRecorder 기본값과 일치.
        // Google STT가 헤더에서 자동 감지하지만 명시해서 mismatch 위험 감소.
        sampleRateHertz: 48000,
        languageCode: this.languageCode,
        enableAutomaticPunctuation: true,
        model: this.model,
      },
      interimResults: false,
    }) as unknown as Duplex

    recognizeStream.on('data', (data: any) => {
      const results: any[] = data.results ?? []
      for (const r of results) {
        const transcript: string = r.alternatives?.[0]?.transcript ?? ''
        if (r.isFinal && transcript.trim()) {
          onResult({ text: transcript.trim(), speaker: null, startTime: null, endTime: null })
        }
      }
    })

    // 상세 에러 로그 — Google API 에러는 code/details/metadata 에 진단 정보가 들어옴
    // (예: code=16 UNAUTHENTICATED, code=7 PERMISSION_DENIED, code=11 OUT_OF_RANGE for 5분 초과)
    recognizeStream.on('error', (err: unknown) => {
      const e = err as {
        message?: string
        code?: number | string
        details?: string
        statusDetails?: unknown
        stack?: string
      }
      this.logger.error(
        `[STT 스트리밍 오류] code=${e.code ?? 'N/A'} message="${e.message ?? ''}"` +
        (e.details ? ` details="${e.details}"` : '') +
        (e.statusDetails ? ` statusDetails=${JSON.stringify(e.statusDetails)}` : ''),
      )
      if (e.stack) this.logger.debug(e.stack)
    })

    recognizeStream.on('end', () => {
      this.logger.log('STT 스트리밍 종료(end) — Google 측 종료 또는 5분 한도')
    })

    recognizeStream.on('close', () => {
      this.logger.debug('STT 스트리밍 종료(close)')
    })

    return recognizeStream
  }
}
