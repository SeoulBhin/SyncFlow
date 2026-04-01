import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

import { User } from './entities/user.entity'
import { OAuthAccount } from './entities/oauth-account.entity'

import { JwtStrategy } from './strategies/jwt.strategy'
import { GoogleStrategy } from './strategies/google.strategy'
import { GithubStrategy } from './strategies/github.strategy'
import { KakaoStrategy } from './strategies/kakao.strategy'

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([User, OAuthAccount]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'fallback-secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GithubStrategy, KakaoStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
