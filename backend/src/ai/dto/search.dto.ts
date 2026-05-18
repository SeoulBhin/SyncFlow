import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class SearchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query: string

  @IsString()
  @IsNotEmpty()
  projectId: string
}
