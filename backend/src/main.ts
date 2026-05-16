import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Static file serving for uploaded files (bypasses /api global prefix)
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // 코드 실행 결과 HTML에 보안 헤더 적용 — useStaticAssets 앞에 등록해야 적용됨
  app.use('/code-runs', (_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    // 사용자 작성 HTML/JS가 같은 origin 권한으로 실행되는 것을 제한
    // allow-scripts는 iframe sandbox로 허용 — 백엔드 서빙 단에서도 이중 제한
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';")
    next()
  })

  // Static file serving for HTML code-run results
  app.useStaticAssets(path.join(process.cwd(), 'code-runs'), {
    prefix: '/code-runs',
  });

  // Global prefix: /api
  app.setGlobalPrefix('api');

  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    credentials: true,
  });

  // Global validation pipe (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`SyncFlow backend running on http://localhost:${port}`);

  // Dev 환경 자동 시드: 테스터 계정이 없으면 생성
  await app.get(AuthService).seedTestUsersIfDev();
}
bootstrap();
