import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { GoogleAuthGuard } from './guards/google-auth.guard'
import { GithubAuthGuard } from './guards/github-auth.guard'
import { KakaoAuthGuard } from './guards/kakao-auth.guard'
import { User } from './entities/user.entity'

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /* ── POST /api/auth/register ── */
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto)
    this.setRefreshCookie(res, tokens.refreshToken)
    return { accessToken: tokens.accessToken }
  }

  /* ── POST /api/auth/login ── */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto)
    this.setRefreshCookie(res, tokens.refreshToken)
    return { accessToken: tokens.accessToken }
  }

  /* ── POST /api/auth/refresh ── */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refreshToken']
    const tokens = await this.authService.refresh(refreshToken)
    this.setRefreshCookie(res, tokens.refreshToken)
    return { accessToken: tokens.accessToken }
  }

  /* ── POST /api/auth/logout ── */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', { path: '/' })
    return { message: '로그아웃 되었습니다' }
  }

  /* ── POST /api/auth/forgot-password ── */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  /* ── POST /api/auth/reset-password ── */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password)
  }

  /* ── GET /api/auth/me ── */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: { user: User }) {
    return this.authService.toProfile(req.user)
  }

  /* ── PUT /api/auth/profile ── */
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: { user: User }, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto)
  }

  /* ── GET /api/auth/oauth/google ── */
  @Get('oauth/google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  /* ── GET /api/auth/oauth/google/cb ── */
  @Get('oauth/google/cb')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: { user: User }, @Res() res: Response) {
    return this.redirectWithTokens(res, this.authService.generateTokens(req.user))
  }

  /* ── GET /api/auth/oauth/github ── */
  @Get('oauth/github')
  @UseGuards(GithubAuthGuard)
  githubLogin() {}

  /* ── GET /api/auth/oauth/github/cb ── */
  @Get('oauth/github/cb')
  @UseGuards(GithubAuthGuard)
  githubCallback(@Req() req: { user: User }, @Res() res: Response) {
    return this.redirectWithTokens(res, this.authService.generateTokens(req.user))
  }

  /* ── GET /api/auth/oauth/kakao ── */
  @Get('oauth/kakao')
  @UseGuards(KakaoAuthGuard)
  kakaoLogin() {}

  /* ── GET /api/auth/oauth/kakao/cb ── */
  @Get('oauth/kakao/cb')
  @UseGuards(KakaoAuthGuard)
  kakaoCallback(@Req() req: { user: User }, @Res() res: Response) {
    return this.redirectWithTokens(res, this.authService.generateTokens(req.user))
  }

  /* ── 내부 헬퍼 ── */

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = this.configService.get('NODE_ENV') === 'production'
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
  }

  private redirectWithTokens(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5174')
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    const url = new URL(`${frontendUrl}/auth/callback`)
    url.searchParams.set('accessToken', tokens.accessToken)
    return res.redirect(url.toString())
  }
}
