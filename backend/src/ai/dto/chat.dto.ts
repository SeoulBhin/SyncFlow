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
  @IsArray()
  @IsString({ each: true })
  referencedFiles?: string[]
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
