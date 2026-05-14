import { IsIn, IsString, MaxLength } from 'class-validator'

export class ExecuteCodeDto {
  @IsIn(['python', 'javascript', 'java', 'c', 'cpp', 'html'])
  language: string

  @IsString()
  @MaxLength(100000)
  code: string
}
