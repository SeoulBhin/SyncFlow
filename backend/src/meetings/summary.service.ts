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
  private genAI: GoogleGenerativeAI

  constructor(private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY', ''),
    )
  }

  async generateSummary(transcripts: string): Promise<SummaryResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
다음은 회의 내용입니다. 아래 형식의 JSON으로 응답해주세요.

회의 내용:
${transcripts}

응답 형식 (JSON만 반환, 설명 없이):
{
  "summary": "회의 전체 내용 요약 (3~5문장)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "actionItems": [
    { "title": "할 일 제목", "assignee": "담당자 이름 또는 null", "dueDate": "YYYY-MM-DD 또는 null" }
  ]
}
`

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
