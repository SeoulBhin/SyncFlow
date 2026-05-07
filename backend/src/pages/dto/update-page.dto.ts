import { IsString, IsOptional, IsInt, IsObject, MaxLength, Min } from 'class-validator'

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

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

export class UpdatePageTitleDto {
  @IsString()
  @MaxLength(300)
  title: string
}
