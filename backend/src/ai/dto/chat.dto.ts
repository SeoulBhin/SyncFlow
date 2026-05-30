import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  MaxLength,
} from 'class-validator'

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string

  @IsOptional()
  @IsUUID()
  conversationId?: string

  @IsOptional()
  @IsUUID()
  projectId?: string

  @IsOptional()
  @IsUUID()
  channelId?: string

  @IsOptional()
  @IsUUID()
  pageId?: string

  // 활성 그룹 ID — page/channel/project 컨텍스트가 없어도 RAG가 그룹 전체
  // 지식베이스를 검색할 수 있게 클라이언트가 항상 함께 보냄.
  @IsOptional()
  @IsUUID()
  groupId?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referencedFiles?: string[]

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  referencedFileIds?: string[]
}

export class InlineQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string

  @IsOptional()
  @IsUUID()
  projectId?: string

  @IsOptional()
  @IsUUID()
  channelId?: string
}

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsUUID()
  projectId?: string
}
