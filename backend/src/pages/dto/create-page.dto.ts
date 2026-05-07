import { IsString, IsOptional, IsIn, IsInt, IsObject, MaxLength, Min } from 'class-validator'

export class CreatePageDto {
  @IsString()
  projectId: string

  @IsString()
  @MaxLength(300)
  title: string

  @IsIn(['document', 'code'])
  type: 'document' | 'code'

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}
