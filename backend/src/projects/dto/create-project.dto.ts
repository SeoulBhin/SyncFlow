import { IsString, IsOptional, IsDateString, IsInt, Min, MaxLength } from 'class-validator'

export class CreateProjectDto {
  @IsString()
  @MaxLength(200)
  name: string

  @IsString()
  groupId: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsDateString()
  deadline?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  /** 프로젝트를 생성한 채널 ID (optional). 설정 시 해당 채널 컨텍스트에서만 프로젝트 채팅이 표시됨. */
  @IsOptional()
  @IsString()
  channelId?: string
}
