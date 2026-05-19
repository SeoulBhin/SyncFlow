import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ActionItem {
  title: string
  assignee: string | null
  dueDate: string | null
}

interface SummaryResult {
  summary: string
  keywords: string[]
  actionItems: ActionItem[]
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name)
  private readonly genAI: GoogleGenerativeAI
  private readonly modelName: string

  constructor(private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    )
    this.modelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash')
    this.logger.log(`Gemini 모델: ${this.modelName}`)
  }

  /**
   * 회의 중 실시간 AI 노트 생성 — 경량 프롬프트로 현재 논의 상황을 4개 항목으로 요약.
   * TODO: 호출 빈도 제어(throttle/debounce)는 호출자(MeetingsGateway)가 담당한다.
   *       Gemini 비용 절감을 위해 transcript 누적 N개 또는 주기 기반 batch 방식으로 호출할 것.
   * 실패 시 에러를 그대로 throw — 호출자가 catch하여 기존 노트를 유지한다.
   */
  async generateMeetingNotes(transcripts: string): Promise<string[]> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName })

    const prompt = `아래는 현재 진행 중인 회의의 발화 내용입니다.
지금까지 논의된 내용을 다음 4가지 항목으로 각 1~2문장 한국어로 요약하세요.
순수 JSON 배열로만 응답하세요 (코드블록·추가 설명 없이).

예시 형식:
["현재 논의 주제: ...", "주요 결정사항: ...", "향후 할 일 후보: ...", "주요 이슈/리스크: ..."]

발화 내용:
${transcripts}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    try {
      const json = text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(json) as unknown
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
        return parsed as string[]
      }
      return [text]
    } catch {
      return [text]
    }
  }

  async generateSummary(transcripts: string): Promise<SummaryResult> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName })

    const today = new Date().toISOString().slice(0, 10)

    const prompt = `당신은 전문 비즈니스 회의 기록 담당자입니다. 아래 회의 트랜스크립트를 분석하여 JSON 형식으로만 응답하세요.

오늘 날짜: ${today}

회의 트랜스크립트:
${transcripts}

출력 규칙:
1. summary: 회의의 핵심 결정 사항, 논의된 주요 이슈, 합의 내용을 3~5문장의 비즈니스 한국어로 작성. "~했습니다", "~입니다" 존댓말 사용.
2. keywords: 회의 주제를 대표하는 명사형 키워드 3~6개.
3. actionItems: 회의에서 명확히 언급된 실행 항목만 추출.
   - title: "~를 완료한다" 또는 "~를 검토한다" 형태의 동사형 제목
   - assignee: 트랜스크립트에서 명시된 담당자 이름. 불명확하면 null.
   - dueDate: 트랜스크립트에서 언급된 마감일을 YYYY-MM-DD 형식으로.
     "다음 주"는 오늘 기준 +7일, "이번 주 금요일"은 해당 날짜로 계산.
     언급 없으면 null.
4. 액션아이템이 없으면 빈 배열 [].

응답 형식 (JSON 코드블록 없이 순수 JSON만):
{
  "summary": "...",
  "keywords": ["키워드1", "키워드2"],
  "actionItems": [
    { "title": "...", "assignee": "이름 또는 null", "dueDate": "YYYY-MM-DD 또는 null" }
  ]
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    try {
      const json = text.replace(/```json\n?|\n?```/g, '').trim()
      return JSON.parse(json) as SummaryResult
    } catch {
      this.logger.warn('Gemini 응답 파싱 실패, 기본값 반환')
      return {
        summary: text,
        keywords: [],
        actionItems: [],
      }
    }
  }
}
