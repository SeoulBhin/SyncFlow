import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateNotificationsDto {
  @IsOptional()
  @IsBoolean()
  notifyMessage?: boolean

  @IsOptional()
  @IsBoolean()
  notifyTask?: boolean

  @IsOptional()
  @IsBoolean()
  notifyDeadline?: boolean

  @IsOptional()
  @IsBoolean()
  notifyBrowser?: boolean
}
