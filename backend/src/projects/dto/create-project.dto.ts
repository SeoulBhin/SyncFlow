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
}
