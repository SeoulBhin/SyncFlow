import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  validate(payload: JwtPayload) {
    const displayName = payload.name ?? payload.email ?? 'User';

    return {
      id: payload.sub,
      email: payload.email,
      name: displayName,
      userId: payload.sub,
      userName: displayName,
    };
  }
}
