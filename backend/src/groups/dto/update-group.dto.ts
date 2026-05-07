import { IsString, IsOptional, IsBoolean, IsIn, MaxLength, IsUUID, IsArray } from 'class-validator'

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private'

  @IsOptional()
  @IsBoolean()
  isExternal?: boolean

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  connectedOrgIds?: string[]
}
