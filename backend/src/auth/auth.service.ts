import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { User } from './entities/user.entity'
import { OAuthAccount } from './entities/oauth-account.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

interface OAuthProfile {
  provider: 'google' | 'github' | 'kakao'
  providerId: string
  providerEmail: string | null
  name: string
  avatarUrl: string | null
  accessToken: string
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OAuthAccount)
    private oauthRepository: Repository<OAuthAccount>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /* ── 회원가입 ── */
  async register(dto: RegisterDto) {
    const exists = await this.userRepository.findOne({ where: { email: dto.email } })
    if (exists) throw new ConflictException('이미 사용 중인 이메일입니다')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = this.userRepository.create({ email: dto.email, passwordHash, name: dto.name })
    await this.userRepository.save(user)
    return this.generateTokens(user)
  }

  /**
   * Dev 환경 전용: 테스터 계정 자동 시드 (tester1/2/3 @ test.com / test1234).
   * 팀이 git pull 후 npm run start:dev 하면 자동으로 같은 계정이 생겨 같이 테스트 가능.
   * production 환경에서는 실행되지 않음.
   */
  async seedTestUsersIfDev() {
    if (process.env.NODE_ENV === 'production') return
    const testers = [
      { email: 'tester1@test.com', password: 'test1234', name: 'Tester1' },
      { email: 'tester2@test.com', password: 'test1234', name: 'Tester2' },
      { email: 'tester3@test.com', password: 'test1234', name: 'Tester3' },
    ]
    let created = 0
    for (const t of testers) {
      const exists = await this.userRepository.findOne({ where: { email: t.email } })
      if (exists) continue
      const passwordHash = await bcrypt.hash(t.password, 10)
      await this.userRepository.save(
        this.userRepository.create({ email: t.email, passwordHash, name: t.name }),
      )
      created++
    }
    if (created > 0) {
      console.log(
        `[seed] Created ${created} test user(s). Login: tester1@test.com / test1234`,
      )
    }
  }

  /* ── 로그인 ── */
  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } })
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다')

    return this.generateTokens(user)
  }

  /* ── 토큰 갱신 ── */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'fallback-refresh-secret'),
      })
      const user = await this.userRepository.findOne({ where: { id: payload.sub } })
      if (!user) throw new UnauthorizedException()
      return this.generateTokens(user)
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다')
    }
  }

  /* ── 비밀번호 재설정 링크 발송 (stub) ── */
  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } })
    // 실제 구현 시 nodemailer로 이메일 발송
    // 유저 존재 여부를 클라이언트에 노출하지 않음
    if (user) {
      // TODO: 재설정 토큰 생성 → 이메일 발송
    }
    return { message: '비밀번호 재설정 링크를 발송했습니다' }
  }

  /* ── 새 비밀번호 설정 (stub) ── */
  async resetPassword(token: string, newPassword: string) {
    // TODO: 토큰 검증 → 유저 조회 → 비밀번호 변경
    // 현재는 stub
    void token
    void newPassword
    return { message: '비밀번호가 변경되었습니다' }
  }

  /* ── 프로필 수정 ── */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다')

    if (dto.name !== undefined) user.name = dto.name
    if (dto.statusMessage !== undefined) user.statusMessage = dto.statusMessage
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl

    await this.userRepository.save(user)
    return this.toProfile(user)
  }

  /* ── OAuth 유저 조회/생성 ── */
  async validateOAuthUser(profile: OAuthProfile): Promise<User> {
    let oauthAccount = await this.oauthRepository.findOne({
      where: { provider: profile.provider, providerId: profile.providerId },
      relations: ['user'],
    })
    if (oauthAccount) {
      oauthAccount.providerAccessToken = profile.accessToken
      await this.oauthRepository.save(oauthAccount)
      return oauthAccount.user
    }

    let user: User | null = null
    if (profile.providerEmail) {
      user = await this.userRepository.findOne({ where: { email: profile.providerEmail } })
    }

    if (!user) {
      const email =
        profile.providerEmail ?? `${profile.provider}_${profile.providerId}@syncflow.local`
      user = this.userRepository.create({
        email,
        passwordHash: null,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        emailVerified: !!profile.providerEmail,
      })
      user = await this.userRepository.save(user)
    }

    oauthAccount = this.oauthRepository.create({
      userId: user.id,
      provider: profile.provider,
      providerId: profile.providerId,
      providerEmail: profile.providerEmail,
      providerAccessToken: profile.accessToken,
    })
    await this.oauthRepository.save(oauthAccount)
    return user
  }

  /* ── userId로 프로필 조회 ── */
  async findById(id: string) {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다')
    return this.toProfile(user)
  }

  /* ── JWT 발급 ── */
  generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, name: user.name }
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'fallback-secret'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
    })
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'fallback-refresh-secret'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d') as any,
    })
    return { accessToken, refreshToken }
  }

  /* ── 프로필 직렬화 ── */
  toProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatarUrl,
      statusMessage: user.statusMessage,
      role: user.role,
      emailVerified: user.emailVerified,
    }
  }
}
