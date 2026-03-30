import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();

    // Development fallback: accept x-user-id / x-user-name headers
    if (
      this.config.get('NODE_ENV') === 'development' &&
      !req.headers['authorization'] &&
      req.headers['x-user-id']
    ) {
      (req as Request & { user: unknown }).user = {
        userId: req.headers['x-user-id'] as string,
        userName: (req.headers['x-user-name'] as string) || 'Unknown',
      };
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<T>(err: Error | null, user: T): T {
    if (err || !user) throw err ?? new UnauthorizedException('인증이 필요합니다');
    return user;
  }
}
