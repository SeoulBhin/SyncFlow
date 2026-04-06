import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import type { Response } from 'express'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UpdateThemeDto } from './dto/update-theme.dto'
import { UpdateNotificationsDto } from './dto/update-notifications.dto'
import { UpdatePasswordDto } from './dto/update-password.dto'
import { User } from '../auth/entities/user.entity'

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  /* ── GET /api/settings ── */
  @Get()
  getSettings(@Req() req: { user: User }) {
    return this.settingsService.getSettings(req.user.id)
  }

  /* ── PUT /api/settings/theme ── */
  @Put('theme')
  updateTheme(@Req() req: { user: User }, @Body() dto: UpdateThemeDto) {
    return this.settingsService.updateTheme(req.user.id, dto)
  }

  /* ── PUT /api/settings/notifications ── */
  @Put('notifications')
  updateNotifications(@Req() req: { user: User }, @Body() dto: UpdateNotificationsDto) {
    return this.settingsService.updateNotifications(req.user.id, dto)
  }

  /* ── PUT /api/settings/password ── */
  @Put('password')
  updatePassword(@Req() req: { user: User }, @Body() dto: UpdatePasswordDto) {
    return this.settingsService.updatePassword(req.user.id, dto)
  }

  /* ── PUT /api/settings/social/:provider (연동 해제) ── */
  @Put('social/:provider')
  @HttpCode(HttpStatus.OK)
  disconnectSocial(@Req() req: { user: User }, @Param('provider') provider: string) {
    return this.settingsService.disconnectSocial(req.user.id, provider)
  }

  /* ── DELETE /api/settings/account ── */
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req: { user: User }, @Res({ passthrough: true }) res: Response) {
    const result = await this.settingsService.deleteAccount(req.user.id)
    res.clearCookie('refreshToken', { path: '/' })
    return result
  }
}
