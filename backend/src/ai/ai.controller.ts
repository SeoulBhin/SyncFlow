import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'

import { AiService } from './ai.service'
import { RagService } from './rag.service'
import { EmbeddingService } from './embedding.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/decorators/current-user.decorator'

// 기존 DTO
import {
  AiChatDto,
  AddKnowledgeDto,
  SearchKnowledgeDto,
  SummarizeDto,
  CodeAssistDto,
  ChatHistoryQueryDto,
} from './dto/ai.dto'

// 신규 DTO
import { ChatDto, InlineQueryDto, CreateConversationDto } from './dto/chat.dto'
import { SearchDto } from './dto/search.dto'

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly ragService: RagService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // ── SSE 스트리밍 채팅 ────────────────────────────────────────────────────

  @Post('chat')
  @HttpCode(200)
  async streamChat(
    @Body() dto: ChatDto,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    await this.aiService.streamToResponse(dto, user, res)
  }

  // ── 인라인 쿼리 (Cmd+K, @AI 멘션) ────────────────────────────────────────

  @Post('inline-query')
  inlineQuery(
    @Body() dto: InlineQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.aiService.inlineQuery(dto, user)
  }

  // ── 대화 관리 ─────────────────────────────────────────────────────────────

  @Get('conversations')
  getConversations(@CurrentUser() user: CurrentUserPayload) {
    return this.aiService.getConversations(user.userId)
  }

  @Post('conversations')
  createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.aiService.createConversation(user, dto)
  }

  @Get('conversations/:id')
  getConversation(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.aiService.getConversationWithMessages(id, user.userId)
  }

  @Delete('conversations/:id')
  @HttpCode(204)
  async deleteConversation(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    await this.aiService.deleteConversation(id, user.userId)
  }

  // ── 사용량 조회 ───────────────────────────────────────────────────────────

  @Get('usage')
  getUsage(@CurrentUser() user: CurrentUserPayload) {
    return this.aiService.getDailyUsage(user.userId)
  }

  // ── 프로젝트 인덱싱 ───────────────────────────────────────────────────────

  @Post('projects/:id/index')
  async indexProject(@Param('id') id: string) {
    return this.embeddingService.indexProjectPages(id)
  }

  @Get('projects/:id/files')
  getIndexedFiles(@Param('id') id: string) {
    return this.embeddingService.getIndexedPagesByProject(id)
  }

  @Post('projects/:id/search')
  searchProjectDocs(
    @Param('id') id: string,
    @Body() dto: SearchDto,
  ) {
    return this.ragService.searchProjectEmbeddings(dto.query, id, 5)
  }

  // ── 기존 레거시 채팅 API (하위 호환 유지) ────────────────────────────────

  @Post('chat/legacy')
  legacyChat(
    @Body() dto: AiChatDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.aiService.chat(dto, user.userId)
  }

  @Get('chat/sessions')
  getSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.aiService.getSessions(user.userId)
  }

  @Get('chat/history')
  getChatHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ChatHistoryQueryDto,
  ) {
    return this.aiService.getChatHistory(user.userId, query)
  }

  @Delete('chat/sessions/:sessionId')
  @HttpCode(204)
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    await this.aiService.deleteSession(sessionId, user.userId)
  }

  // ── 문서 요약 ─────────────────────────────────────────────────────────────

  @Post('summarize')
  summarize(@Body() dto: SummarizeDto) {
    return this.aiService.summarize(dto)
  }

  // ── 코드 지원 ─────────────────────────────────────────────────────────────

  @Post('code')
  codeAssist(@Body() dto: CodeAssistDto) {
    return this.aiService.codeAssist(dto)
  }

  // ── 회의록 분석 ───────────────────────────────────────────────────────────

  @Post('transcript/analyze')
  analyzeTranscript(
    @Body() body: { transcript: string; question: string; groupId?: string },
  ) {
    return this.aiService.analyzeTranscript(body.transcript, body.question, body.groupId)
  }

  @Post('extract-tasks')
  extractTasks(@Body() body: { content: string }) {
    return this.aiService.extractTasks(body.content)
  }

  // ── 지식 베이스 (ai_knowledge 테이블 기반) ───────────────────────────────

  @Post('knowledge')
  addKnowledge(@Body() dto: AddKnowledgeDto) {
    return this.ragService.addKnowledge(dto)
  }

  @Post('knowledge/search')
  searchKnowledge(@Body() dto: SearchKnowledgeDto) {
    return this.ragService.search(dto)
  }

  @Get('knowledge')
  listKnowledge(@Query('groupId') groupId?: string) {
    return this.ragService.listKnowledge(groupId)
  }

  @Delete('knowledge/source/:sourceId')
  @HttpCode(204)
  async deleteKnowledge(@Param('sourceId') sourceId: string): Promise<void> {
    await this.ragService.deleteBySource(sourceId)
  }

  @Post('knowledge/reindex/:sourceId')
  reindexKnowledge(
    @Param('sourceId') sourceId: string,
    @Body() dto: AddKnowledgeDto,
  ) {
    return this.ragService.reindexSource(sourceId, { ...dto, sourceId })
  }
}
