import { IsIn } from 'class-validator'

export class UpdateThemeDto {
  @IsIn(['light', 'dark', 'system'])
  theme: 'light' | 'dark' | 'system'
}
