import { IsString, IsOptional, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  statusMessage?: string

  @IsOptional()
  @IsString()
  avatarUrl?: string
}
