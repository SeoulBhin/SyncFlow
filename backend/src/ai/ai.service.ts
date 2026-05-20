import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI, type Content } from '@google/generative-ai'
import { v4 as uuidv4 } from 'uuid'
import type { Response } from 'express'
import * as Y from 'yjs'

import { AiChatHistory } from './entities/ai-chat-history.entity'
import { AiConversation } from './entities/ai-conversation.entity'
import { AiMessage } from './entities/ai-message.entity'
import { RagService } from './rag.service'
import {
  AiChatDto,
  SummarizeDto,
  CodeAssistDto,
  ChatHistoryQueryDto,
} from './dto/ai.dto'
import { ChatDto, InlineQueryDto, CreateConversationDto } from './dto/chat.dto'
import { type CurrentUserPayload } from '../auth/decorators/current-user.decorator'
import { type RagSearchResult, type ProjectSearchResult } from './rag.service'

const MAX_HISTORY_TURNS = 10
const RAG_SIMILARITY_THRESHOLD = 0.5

const DAILY_LIMITS: Record<string, number> = {
  free: 10,
  pro: 100,
  team: Infinity,
}

const MONTHLY_LIMITS: Record<string, number> = {
  free: 300,
  pro: 3000,
  team: Infinity,
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly genAI: GoogleGenerativeAI
  private readonly modelName: string

  constructor(
    private readonly config: ConfigService,
    private readonly ragService: RagService,
    private readonly dataSource: DataSource,
    @InjectRepository(AiChatHistory)
    private readonly historyRepo: Repository<AiChatHistory>,
    @InjectRepository(AiConversation)
    private readonly conversationRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly messageRepo: Repository<AiMessage>,
  ) {
    this.genAI = new GoogleGenerativeAI(this.config.getOrThrow<string>('GEMINI_API_KEY'))
    this.modelName = this.config.get<string>('GEMINI_MODEL', 'gemini-2.5-flash')
    this.logger.log(`AI 모델: ${this.modelName}`)
  }

  // ── 멤버 목록 질문 감지 (hallucination 방지) ──────────────────────────────

  private isMemberListQuery(content: string): boolean {
    return /팀원|멤버|참여자|채널.*사람|사람.*채널|누가\s*있|있.*누구|참가자|구성원|인원|멤버\s*목록|목록.*멤버|팀\s*목록|목록.*팀|who.*in|channel.*member/i.test(
      content,
    )
  }

  private async fetchChannelMembers(
    channelId: string,
  ): Promise<Array<{ userId: string; userName: string }>> {
    const rows = await this.dataSource.query<Array<{ user_id: string; user_name: string }>>(
      `SELECT user_id, user_name FROM channel_members WHERE channel_id = $1 ORDER BY joined_at ASC`,
      [channelId],
    )
    return rows.map((r) => ({ userId: r.user_id, userName: r.user_name || '(이름 없음)' }))
  }

  private async streamMemberListResponse(
    channelId: string,
    conversationId: string,
    content: string,
    res: Response,
  ): Promise<void> {
    const members = await this.fetchChannelMembers(channelId)

    let reply: string
    if (members.length === 0) {
      reply = '현재 채널에 표시할 멤버가 없습니다.'
    } else {
      const list = members.map((m) => `- ${m.userName}`).join('\n')
      reply = `현재 채널의 멤버는 총 ${members.length}명입니다.\n\n${list}`
    }

    res.write(
      `data: ${JSON.stringify({ text: reply, done: false, conversationId })}\n\n`,
    )
    res.write(
      `data: ${JSON.stringify({ text: '', done: true, conversationId })}\n\n`,
    )
    res.end()

    this.saveConversationMessages(conversationId, content, reply, null, null).catch(() => {})
  }

  // ── SSE 스트리밍 채팅 ─────────────────────────────────────────────────────

  async streamToResponse(dto: ChatDto, user: CurrentUserPayload, res: Response): Promise<void> {
    await this.checkUsageLimit(user.userId)

    // 대화 세션 확인 또는 신규 생성
    let conversation: AiConversation
    if (dto.conversationId) {
      const found = await this.conversationRepo.findOne({
        where: { id: dto.conversationId, userId: user.userId },
      })
      if (!found) {
        throw new NotFoundException('대화를 찾을 수 없습니다')
      }
      conversation = found
    } else {
      const title = dto.content.slice(0, 60).trim() || '새 대화'
      conversation = await this.conversationRepo.save(
        this.conversationRepo.create({
          userId: user.userId,
          projectId: dto.projectId ?? null,
          title,
        }),
      )
    }

    // 채널 멤버 목록 질문 → Gemini 호출 없이 실제 DB 결과로 직접 응답
    if (dto.channelId && this.isMemberListQuery(dto.content)) {
      await this.streamMemberListResponse(dto.channelId, conversation.id, dto.content, res)
      return
    }

    // 프로젝트 RAG 검색
    const projectId = conversation.projectId
    const ragChunks =
      projectId && projectId.length > 0
        ? await this.ragService
            .searchProjectEmbeddings(dto.content, projectId, 5)
            .catch(() => [])
        : []

    const relevantChunks = ragChunks.filter((c) => c.similarity >= RAG_SIMILARITY_THRESHOLD)

    // @파일 참조 콘텐츠 로드 (UUID 배열 우선, 없으면 레거시 이름 배열 무시)
    const referencedPageContents = await this.loadReferencedFiles(dto.referencedFileIds)

    // 시스템 프롬프트 구성
    let systemPrompt = this.ragService.buildRagSystemPrompt(
      relevantChunks,
      referencedPageContents,
    )

    // 현재 문서 컨텍스트 주입 (pageId가 있을 때)
    if (dto.pageId) {
      const pageCtx = await this.fetchPageContentForAI(dto.pageId)
      if (pageCtx?.text) {
        const truncated =
          pageCtx.text.length > 4000
            ? pageCtx.text.slice(0, 4000) + '\n[이하 생략 — 내용이 너무 깁니다]'
            : pageCtx.text
        systemPrompt += `\n\n## 현재 열려 있는 문서\n**제목: ${pageCtx.title}**\n\n${truncated}\n\n위 문서를 기반으로 요약/분석 요청에 답변하세요. 문서에 없는 내용은 추측하지 마세요.`
      } else {
        systemPrompt +=
          '\n\n[현재 문서를 불러올 수 없습니다. 사용자가 문서 요약을 요청하면 문서를 불러올 수 없다고 안내하세요.]'
      }
    }

    // 현재 채널 메시지 컨텍스트 주입 (channelId 있고 멤버 목록 질문 아닐 때)
    if (dto.channelId) {
      const recentMessages = await this.fetchChannelRecentMessages(dto.channelId, user.userId)
      if (recentMessages.length > 0) {
        const msgLines = recentMessages
          .map((m) => `**${m.authorName}**: ${m.content}`)
          .join('\n')
        systemPrompt += `\n\n## 현재 채널 최근 메시지 (${recentMessages.length}개)\n${msgLines}\n\n위 채널 내용을 기반으로 요약/분석 요청에 답변하세요.`
      } else {
        systemPrompt +=
          '\n\n[현재 채널 메시지를 불러올 수 없거나 채널에 메시지가 없습니다.]'
      }
    }

    // 파일 참조 요청했으나 내용을 찾지 못한 경우 안내
    if (dto.referencedFileIds?.length && referencedPageContents.length === 0) {
      systemPrompt +=
        '\n\n[선택한 파일 내용을 찾을 수 없습니다. 사용자에게 "선택한 파일의 내용을 불러올 수 없습니다. 파일이 존재하는지 확인해주세요."라고 안내하세요.]'
    }

    // 문서/채널 컨텍스트 없을 때 AI에게 안내 추가
    if (!dto.pageId && !dto.channelId && !dto.referencedFileIds?.length) {
      systemPrompt +=
        '\n\n[컨텍스트 없음] 사용자가 "이 문서 요약해줘", "이 채널 정리해줘" 등 특정 문서나 채널 내용을 요청하면 "현재 선택된 문서나 채널이 없습니다. 문서 에디터나 채널 화면에서 AI 패널을 열거나, 파일 탭에서 파일을 선택한 뒤 다시 질문해주세요."라고 안내하세요.'
    }

    // 이전 대화 이력 로드 (멀티턴용)
    const previousMessages = await this.messageRepo.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'ASC' },
      take: MAX_HISTORY_TURNS * 2,
    })

    const history: Content[] = previousMessages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt,
    })

    // 스트리밍 응답 생성 및 SSE 전송
    let fullResponse = ''
    let tokensUsed: number | null = null

    try {
      const streamResult = await model.generateContentStream({
        contents: [...history, { role: 'user', parts: [{ text: dto.content }] }],
      })

      for await (const chunk of streamResult.stream) {
        const text = chunk.text()
        if (text) {
          fullResponse += text
          res.write(`data: ${JSON.stringify({ text, done: false, conversationId: conversation.id })}\n\n`)
        }
      }

      const finalResponse = await streamResult.response
      tokensUsed = finalResponse.usageMetadata?.totalTokenCount ?? null
    } catch (err) {
      this.logger.error(`스트리밍 실패: ${(err as Error).message}`)
      res.write(
        `data: ${JSON.stringify({ error: 'AI 응답 생성에 실패했습니다', done: true })}\n\n`,
      )
      res.end()
      return
    }

    res.write(`data: ${JSON.stringify({ text: '', done: true, conversationId: conversation.id })}\n\n`)
    res.end()

    // 스트리밍 완료 후 메시지 저장 (비동기, 응답 지연 없이)
    this.saveConversationMessages(
      conversation.id,
      dto.content,
      fullResponse,
      dto.referencedFiles ?? null,
      tokensUsed,
    ).catch((err) => this.logger.warn(`메시지 저장 실패: ${(err as Error).message}`))
  }

  // ── 인라인 쿼리 (Cmd+K, @AI 멘션) ────────────────────────────────────────

  async inlineQuery(dto: InlineQueryDto, user: CurrentUserPayload): Promise<string> {
    await this.checkUsageLimit(user.userId)

    let contextChunks: Array<{ title: string | null; content: string; sourceType: string }> = []

    if (dto.projectId) {
      const projectChunks = await this.ragService
        .searchProjectEmbeddings(dto.content, dto.projectId, 3)
        .catch((): ProjectSearchResult[] => [])

      contextChunks = projectChunks
        .filter((c) => c.similarity >= RAG_SIMILARITY_THRESHOLD)
        .map((c) => ({
          title: typeof c.metadata?.['pageTitle'] === 'string' ? (c.metadata['pageTitle'] as string) : null,
          content: c.content,
          sourceType: 'page',
        }))
    } else {
      const knowledgeChunks = await this.ragService
        .search({ query: dto.content, groupId: undefined, limit: 3 })
        .catch((): RagSearchResult[] => [])

      contextChunks = knowledgeChunks
        .filter((c) => c.similarity >= RAG_SIMILARITY_THRESHOLD)
        .map((c) => ({
          title: c.title,
          content: c.content,
          sourceType: c.sourceType,
        }))
    }

    const systemPrompt = this.buildLegacySystemPrompt(contextChunks)

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt,
    })

    const result = await model.generateContent(dto.content)
    return result.response.text()
  }

  // ── 채널 @AI 멘션용 빠른 응답 (세션/이력 없이 단발성, 하위 호환 유지) ────

  async quickReply(
    message: string,
    context: { groupId?: string; channelId?: string },
  ): Promise<string> {
    const ragResults = await this.ragService
      .search({ query: message, groupId: context.groupId, limit: 3 })
      .catch((): RagSearchResult[] => [])

    const relevant = ragResults.filter((r) => r.similarity >= RAG_SIMILARITY_THRESHOLD)
    const systemPrompt = this.buildLegacySystemPrompt(relevant)

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt,
    })

    const result = await model.generateContent(message)
    return result.response.text()
  }

  // ── 대화 관리 ─────────────────────────────────────────────────────────────

  async createConversation(
    user: CurrentUserPayload,
    dto: CreateConversationDto,
  ): Promise<AiConversation> {
    return this.conversationRepo.save(
      this.conversationRepo.create({
        userId: user.userId,
        projectId: dto.projectId ?? null,
        title: dto.title?.trim() || '새 대화',
      }),
    )
  }

  async getConversations(userId: string): Promise<AiConversation[]> {
    return this.conversationRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 50,
    })
  }

  async getConversationWithMessages(
    id: string,
    userId: string,
  ): Promise<AiConversation & { messages: AiMessage[] }> {
    const conversation = await this.conversationRepo.findOne({
      where: { id, userId },
    })

    if (!conversation) {
      throw new NotFoundException('대화를 찾을 수 없습니다')
    }

    const messages = await this.messageRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    })

    return { ...conversation, messages }
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepo.findOne({
      where: { id, userId },
    })

    if (!conversation) {
      throw new NotFoundException('대화를 찾을 수 없습니다')
    }

    await this.conversationRepo.remove(conversation)
  }

  // ── 사용량 관리 ───────────────────────────────────────────────────────────

  async getDailyUsage(userId: string): Promise<{
    plan: string
    daily: { used: number; limit: number }
    monthly: { used: number; limit: number }
    unlimited: boolean
  }> {
    const isUnlimited = await this.isUnlimitedUser(userId)
    if (isUnlimited) {
      return {
        plan: 'admin',
        daily: { used: 0, limit: -1 },
        monthly: { used: 0, limit: -1 },
        unlimited: true,
      }
    }

    const plan = await this.getUserPlan(userId)
    const dailyLimit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free
    const monthlyLimit = MONTHLY_LIMITS[plan] ?? MONTHLY_LIMITS.free
    const [dailyUsed, monthlyUsed] = await Promise.all([
      this.countTodayUserMessages(userId),
      this.countThisMonthUserMessages(userId),
    ])

    return {
      plan,
      daily: { used: dailyUsed, limit: isFinite(dailyLimit) ? dailyLimit : -1 },
      monthly: { used: monthlyUsed, limit: isFinite(monthlyLimit) ? monthlyLimit : -1 },
      unlimited: false,
    }
  }

  // ── 기존 멀티턴 채팅 (ai_chat_history 기반, 하위 호환) ──────────────────

  async chat(dto: AiChatDto, userId: string) {
    const sessionId = dto.sessionId ?? uuidv4()

    const ragResults = await this.ragService
      .search({ query: dto.message, groupId: dto.groupId, limit: 5 })
      .catch((): RagSearchResult[] => [])

    const relevantContext = ragResults
      .filter((r) => r.similarity >= RAG_SIMILARITY_THRESHOLD)
      .slice(0, 3)

    const previousHistory = await this.historyRepo.find({
      where: { sessionId, userId },
      order: { createdAt: 'ASC' },
      take: MAX_HISTORY_TURNS * 2,
    })

    const systemPrompt = this.buildLegacySystemPrompt(relevantContext)

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt,
    })

    const history: Content[] = previousHistory.map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }))

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(dto.message)
    const responseText = result.response.text()
    const tokenCount = result.response.usageMetadata?.totalTokenCount ?? null

    await this.historyRepo.save([
      this.historyRepo.create({
        sessionId,
        userId,
        groupId: dto.groupId ?? null,
        channelId: dto.channelId ?? null,
        role: 'user',
        content: dto.message,
        sourceIds: null,
      }),
      this.historyRepo.create({
        sessionId,
        userId,
        groupId: dto.groupId ?? null,
        channelId: dto.channelId ?? null,
        role: 'assistant',
        content: responseText,
        sourceIds: relevantContext.map((r) => r.id),
        tokenCount,
      }),
    ])

    return {
      sessionId,
      message: responseText,
      sources: relevantContext.map((r) => ({
        id: r.id,
        title: r.title,
        sourceType: r.sourceType,
        similarity: Math.round(r.similarity * 100) / 100,
      })),
      tokenCount,
    }
  }

  // ── 문서 요약 ─────────────────────────────────────────────────────────────

  async summarize(dto: SummarizeDto) {
    const styleGuide = {
      brief: '3문장 이내의 간결한 요약',
      detailed: '주요 섹션별로 나눈 상세 요약 (마크다운 헤더 사용)',
      bullet: '핵심 내용을 불릿 포인트로 정리 (5~10개 항목)',
    }[dto.style ?? 'brief']

    const prompt = `다음 내용을 ${styleGuide}으로 작성하세요.
언어: ${dto.language ?? '한국어'}

내용:
${dto.content}

출력 규칙:
- 마크다운 형식 사용
- 원본에 없는 내용 추가 금지
- 핵심 키워드는 **볼드** 처리`

    const model = this.genAI.getGenerativeModel({ model: this.modelName })
    const result = await model.generateContent(prompt)
    const summary = result.response.text()

    return {
      summary,
      style: dto.style ?? 'brief',
      tokenCount: result.response.usageMetadata?.totalTokenCount ?? null,
    }
  }

  // ── 코드 지원 ─────────────────────────────────────────────────────────────

  async codeAssist(dto: CodeAssistDto) {
    const actionPrompts: Record<CodeAssistDto['action'], string> = {
      explain: `다음 ${dto.language ?? ''}코드를 한국어로 설명하세요. 함수/변수 역할, 알고리즘, 주의사항을 포함하세요.`,
      review: `다음 ${dto.language ?? ''}코드를 코드 리뷰하세요. 버그 가능성, 성능 문제, 코딩 컨벤션, 개선 제안을 포함하세요.`,
      fix: `다음 ${dto.language ?? ''}코드의 버그를 찾아 수정하세요. 수정 사유와 함께 수정된 전체 코드를 제공하세요.`,
      optimize: `다음 ${dto.language ?? ''}코드를 성능/가독성 측면에서 최적화하세요. 변경 사항과 이유를 설명하고 최적화된 코드를 제공하세요.`,
      test: `다음 ${dto.language ?? ''}코드에 대한 단위 테스트를 작성하세요. 엣지 케이스를 포함한 완전한 테스트 코드를 제공하세요.`,
      document: `다음 ${dto.language ?? ''}코드에 JSDoc/docstring 등 적절한 문서 주석을 추가하세요. 문서화된 전체 코드를 반환하세요.`,
    }

    const basePrompt = actionPrompts[dto.action]
    const extraInstructions = dto.instructions ? `\n추가 지시사항: ${dto.instructions}` : ''

    const prompt = `${basePrompt}${extraInstructions}

\`\`\`${dto.language ?? ''}
${dto.code}
\`\`\`

응답은 마크다운 형식으로 작성하세요.`

    const model = this.genAI.getGenerativeModel({ model: this.modelName })
    const result = await model.generateContent(prompt)

    return {
      result: result.response.text(),
      action: dto.action,
      tokenCount: result.response.usageMetadata?.totalTokenCount ?? null,
    }
  }

  // ── 회의록 분석 ───────────────────────────────────────────────────────────

  async analyzeTranscript(transcript: string, question: string, groupId?: string) {
    const prompt = `다음 회의 트랜스크립트를 바탕으로 질문에 답변하세요.

회의 내용:
${transcript}

질문: ${question}

답변 규칙:
- 트랜스크립트에 있는 내용만 바탕으로 답변
- 내용이 없으면 "회의 내용에서 찾을 수 없습니다" 라고 답변
- 관련 발언자와 발언 내용을 인용해서 답변`

    const model = this.genAI.getGenerativeModel({ model: this.modelName })
    const result = await model.generateContent(prompt)

    return {
      answer: result.response.text(),
      tokenCount: result.response.usageMetadata?.totalTokenCount ?? null,
    }
  }

  // ── 태스크 자동 추출 ──────────────────────────────────────────────────────

  async extractTasks(content: string) {
    const today = new Date().toISOString().slice(0, 10)
    const prompt = `다음 텍스트에서 실행 가능한 태스크(할 일)을 추출하세요.
오늘 날짜: ${today}

텍스트:
${content}

출력 규칙 (순수 JSON만, 코드블록 없이):
{
  "tasks": [
    {
      "title": "태스크 제목 (동사형, 50자 이내)",
      "assignee": "담당자 이름 또는 null",
      "dueDate": "YYYY-MM-DD 또는 null",
      "priority": "low|medium|high|urgent"
    }
  ]
}

태스크가 없으면 tasks를 빈 배열로.`

    const model = this.genAI.getGenerativeModel({ model: this.modelName })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    try {
      const json = text.replace(/```json\n?|\n?```/g, '').trim()
      return JSON.parse(json) as {
        tasks: Array<{
          title: string
          assignee: string | null
          dueDate: string | null
          priority: string
        }>
      }
    } catch {
      this.logger.warn('태스크 추출 파싱 실패')
      return { tasks: [] }
    }
  }

  // ── 대화 이력 (ai_chat_history 기반, 하위 호환) ──────────────────────────

  async getChatHistory(userId: string, query: ChatHistoryQueryDto) {
    const qb = this.historyRepo
      .createQueryBuilder('h')
      .where('h.userId = :userId', { userId })
      .orderBy('h.createdAt', 'DESC')
      .take(query.limit ?? 50)

    if (query.sessionId) {
      qb.andWhere('h.sessionId = :sessionId', { sessionId: query.sessionId })
    }

    return (await qb.getMany()).reverse()
  }

  async getSessions(userId: string) {
    const rows = await this.historyRepo
      .createQueryBuilder('h')
      .select(['h.sessionId', 'h.groupId'])
      .addSelect('MIN(h.createdAt)', 'startedAt')
      .addSelect('MAX(h.createdAt)', 'lastAt')
      .addSelect('COUNT(*)', 'messageCount')
      .addSelect(
        `(SELECT content FROM ai_chat_history
          WHERE session_id = h.session_id AND user_id = h.user_id AND role = 'user'
          ORDER BY created_at ASC LIMIT 1)`,
        'firstMessage',
      )
      .where('h.userId = :userId', { userId })
      .groupBy('h.sessionId, h.groupId')
      .orderBy('MAX(h.createdAt)', 'DESC')
      .take(20)
      .getRawMany()

    return rows.map((r) => ({
      sessionId: r.h_session_id ?? r.session_id,
      groupId: r.h_group_id ?? r.group_id,
      startedAt: r.startedAt,
      lastAt: r.lastAt,
      messageCount: parseInt(r.messageCount, 10),
      firstMessage: (r.firstMessage as string | null)?.slice(0, 80),
    }))
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    await this.historyRepo.delete({ sessionId, userId })
  }

  // ── 내부 헬퍼 ─────────────────────────────────────────────────────────────

  private async checkUsageLimit(userId: string): Promise<void> {
    const isUnlimited = await this.isUnlimitedUser(userId)
    if (isUnlimited) return

    const plan = await this.getUserPlan(userId)
    const limit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free

    if (!isFinite(limit)) return

    const used = await this.countTodayUserMessages(userId)
    if (used >= limit) {
      throw new ForbiddenException(
        `일일 AI 사용량 한도(${limit}회)를 초과했습니다. 플랜 업그레이드를 고려해주세요.`,
      )
    }
  }

  private async isUnlimitedUser(userId: string): Promise<boolean> {
    try {
      const rows = await this.dataSource.query<Array<{ role: string }>>(
        `SELECT role FROM users WHERE id = $1 LIMIT 1`,
        [userId],
      )
      const role = rows[0]?.role ?? 'member'
      return role === 'admin' || role === 'tester'
    } catch {
      return false
    }
  }

  private async getUserPlan(_userId: string): Promise<string> {
    // subscriptions 테이블 미구현 — 전원 free 플랜으로 처리
    // 구독 기능(backend/src/subscriptions) 구현 시 이 메서드에 DB 쿼리 추가
    return 'free'
  }

  private async countTodayUserMessages(userId: string): Promise<number> {
    try {
      const rows = await this.dataSource.query<Array<{ count: string }>>(
        `SELECT COUNT(*) AS count
         FROM ai_messages am
         JOIN ai_conversations ac ON ac.id = am.conversation_id
         WHERE ac.user_id = $1
           AND am.role = 'user'
           AND am.created_at >= CURRENT_DATE`,
        [userId],
      )
      return parseInt(rows[0]?.count ?? '0', 10)
    } catch {
      return 0
    }
  }

  private async countThisMonthUserMessages(userId: string): Promise<number> {
    try {
      const rows = await this.dataSource.query<Array<{ count: string }>>(
        `SELECT COUNT(*) AS count
         FROM ai_messages am
         JOIN ai_conversations ac ON ac.id = am.conversation_id
         WHERE ac.user_id = $1
           AND am.role = 'user'
           AND am.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [userId],
      )
      return parseInt(rows[0]?.count ?? '0', 10)
    } catch {
      return 0
    }
  }

  private async saveConversationMessages(
    conversationId: string,
    userContent: string,
    assistantContent: string,
    referencedFiles: string[] | null,
    tokensUsed: number | null,
  ): Promise<void> {
    await this.messageRepo.save([
      this.messageRepo.create({
        conversationId,
        role: 'user',
        content: userContent,
        referencedFiles: referencedFiles ?? null,
        tokensUsed: null,
      }),
      this.messageRepo.create({
        conversationId,
        role: 'assistant',
        content: assistantContent,
        referencedFiles: null,
        tokensUsed,
      }),
    ])

    await this.conversationRepo.update(conversationId, { updatedAt: new Date() })
  }

  private async loadReferencedFiles(
    fileIds?: string[],
  ): Promise<Array<{ title: string; content: string }>> {
    if (!fileIds || fileIds.length === 0) return []

    const results: Array<{ title: string; content: string }> = []

    for (const fileId of fileIds) {
      try {
        const rows = await this.dataSource.query<
          Array<{ title: string; content: unknown; type: string; language: string | null }>
        >(
          `SELECT title, content, type, language FROM pages WHERE id = $1 LIMIT 1`,
          [fileId],
        )
        if (rows[0]) {
          const textContent = this.decodeYjsToText(rows[0].content, rows[0].type, rows[0].language)
          if (textContent) {
            const truncated =
              textContent.length > 3000
                ? textContent.slice(0, 3000) + '\n[이하 생략]'
                : textContent
            results.push({ title: rows[0].title || '제목 없음', content: truncated })
          }
        }
      } catch {
        // 파일 로드 실패 시 무시하고 계속 진행
      }
    }

    return results
  }

  private extractPageText(content: unknown, type: string): string {
    if (!content) return ''
    if (type === 'code') {
      if (typeof content === 'string') return content
      const obj = content as Record<string, unknown>
      return typeof obj['code'] === 'string' ? (obj['code'] as string) : JSON.stringify(content)
    }
    return this.extractTipTapText(content)
  }

  private extractTipTapText(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as { text?: string; content?: unknown[] }
    let text = typeof n.text === 'string' ? n.text : ''
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        const childText = this.extractTipTapText(child)
        if (childText) text += (text ? ' ' : '') + childText
      }
    }
    return text
  }

  // Yjs base64 binary → 평문 텍스트 변환 (문서: XML fragment 태그 제거, 코드: Y.Text)
  private decodeYjsToText(
    contentRaw: unknown,
    type: string | null,
    language?: string | null,
  ): string {
    if (!contentRaw) return ''

    // 이미 객체(TipTap JSON)면 기존 extractPageText 사용
    if (typeof contentRaw === 'object') {
      return this.extractPageText(contentRaw, type ?? 'document')
    }

    if (typeof contentRaw !== 'string' || contentRaw.length === 0) return ''

    // Yjs base64 디코드 시도
    try {
      const buffer = Buffer.from(contentRaw, 'base64')
      const ydoc = new Y.Doc()
      Y.applyUpdate(ydoc, buffer)

      let text: string
      if (type === 'code') {
        text = ydoc.getText(language ?? 'javascript').toString()
      } else {
        // XML fragment → 태그 제거하여 순수 텍스트 추출
        const xmlStr = ydoc.getXmlFragment('default').toString()
        text = xmlStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      }
      ydoc.destroy()
      return text
    } catch {
      // Yjs 디코드 실패
    }

    // legacy JSON string 시도
    try {
      const parsed = JSON.parse(contentRaw) as unknown
      return this.extractPageText(parsed, type ?? 'document')
    } catch {
      // JSON 아님
    }

    return ''
  }

  // 페이지 ID로 문서 내용을 평문 텍스트로 로드
  private async fetchPageContentForAI(
    pageId: string,
  ): Promise<{ title: string; text: string } | null> {
    try {
      const rows = await this.dataSource.query<
        Array<{
          title: string
          content: unknown
          type: string | null
          language: string | null
        }>
      >(
        `SELECT title, content, type, language FROM pages WHERE id = $1 LIMIT 1`,
        [pageId],
      )
      if (!rows[0]) return null

      const { title, content, type, language } = rows[0]
      const text = this.decodeYjsToText(content, type, language)
      return { title: title || '제목 없음', text }
    } catch {
      return null
    }
  }

  // 채널 최근 메시지 로드 (멤버 권한 검증 포함)
  private async fetchChannelRecentMessages(
    channelId: string,
    userId: string,
  ): Promise<Array<{ authorName: string; content: string }>> {
    try {
      const memberCheck = await this.dataSource.query<Array<{ user_id: string }>>(
        `SELECT user_id FROM channel_members WHERE channel_id = $1 AND user_id = $2 LIMIT 1`,
        [channelId, userId],
      )
      if (!memberCheck.length) return []

      const rows = await this.dataSource.query<
        Array<{ author_name: string; content: string }>
      >(
        `SELECT author_name, content
         FROM messages
         WHERE channel_id = $1 AND is_system = false AND parent_id IS NULL
         ORDER BY created_at DESC
         LIMIT 50`,
        [channelId],
      )
      return rows.reverse().map((r) => ({
        authorName: r.author_name || '알 수 없음',
        content: r.content,
      }))
    } catch {
      return []
    }
  }

  private buildLegacySystemPrompt(
    ragResults: Array<{ title: string | null; content: string; sourceType: string }>,
  ): string {
    const contextSection =
      ragResults.length > 0
        ? `\n\n## 참고 컨텍스트 (워크스페이스 지식 베이스)\n${ragResults
            .map(
              (r, i) =>
                `[출처 ${i + 1}] ${r.title ? `**${r.title}**` : `(${r.sourceType})`}\n${r.content}`,
            )
            .join('\n\n')}\n\n위 컨텍스트를 우선적으로 참고하여 답변하세요.`
        : ''

    return `당신은 SyncFlow 워크스페이스의 AI 어시스턴트입니다. 팀원들의 업무를 도와주는 역할을 합니다.

기본 원칙:
- 한국어로 답변 (사용자가 다른 언어를 쓰면 그에 맞춤)
- 명확하고 실용적인 답변 제공
- 마크다운 형식 적극 활용
- 모르는 내용은 솔직히 인정

${contextSection}`
  }
}
