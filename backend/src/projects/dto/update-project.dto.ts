import { IsString, IsOptional, IsDateString, IsInt, Min, MaxLength } from 'class-validator'

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

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
