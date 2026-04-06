import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'

export class RegisterDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  password: string

  @IsString()
  @MinLength(1, { message: '이름을 입력해주세요' })
  @MaxLength(100)
  name: string
}
