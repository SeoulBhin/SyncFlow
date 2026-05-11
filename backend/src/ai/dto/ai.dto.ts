import {
  IsString,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  MaxLength,
  IsIn,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator'

// ── 채팅 ──────────────────────────────────────────────────────────────────

export class AiChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string

  // 세션 ID (없으면 새 세션 생성)
  @IsOptional()
  @IsUUID()
  sessionId?: string

  // 그룹 컨텍스트 (RAG 범위 한정)
  @IsOptional()
  @IsUUID()
  groupId?: string

  // 채널 컨텍스트
  @IsOptional()
  @IsUUID()
  channelId?: string

  // 프로젝트 컨텍스트
  @IsOptional()
  @IsUUID()
  projectId?: string
}

// ── 지식 베이스 ───────────────────────────────────────────────────────────

export class AddKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  content: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string

  @IsIn(['page', 'message', 'meeting', 'manual'])
  sourceType: 'page' | 'message' | 'meeting' | 'manual'

  @IsOptional()
  @IsUUID()
  sourceId?: string

  @IsOptional()
  @IsUUID()
  groupId?: string

  @IsOptional()
  metadata?: Record<string, unknown>
}

export class SearchKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query: string

  @IsOptional()
  @IsUUID()
  groupId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number
}

// ── 문서 요약/분석 ────────────────────────────────────────────────────────

export class SummarizeDto {
  @IsString()
  @IsNotEmpty()
  content: string

  @IsOptional()
  @IsIn(['brief', 'detailed', 'bullet'])
  style?: 'brief' | 'detailed' | 'bullet'

  @IsOptional()
  @IsString()
  language?: string
}

// ── 코드 지원 ─────────────────────────────────────────────────────────────

export class CodeAssistDto {
  @IsString()
  @IsNotEmpty()
  code: string

  @IsIn(['explain', 'review', 'fix', 'optimize', 'test', 'document'])
  action: 'explain' | 'review' | 'fix' | 'optimize' | 'test' | 'document'

  @IsOptional()
  @IsString()
  language?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string
}

// ── 채팅 히스토리 쿼리 ───────────────────────────────────────────────────

export class ChatHistoryQueryDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number
}
