import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import express from 'express';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // rawBody: true — LiveKit Webhook 서명 검증 시 WebhookReceiver.receive에 raw body 전달 필요
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // LiveKit webhook raw body capture
  // NestJS rawBody:true 의 bodyParser.json verify 콜백은 application/json 에만 동작한다.
  // LiveKit은 application/webhook+json 으로 전송하므로 bodyParser가 스킵 → req.rawBody 미설정 → 서명 검증 실패.
  // express.raw({ type: '*/*' }) 를 웹훅 경로에만 등록해서 raw Buffer를 req.rawBody 에 저장.
  // (일반 /api/* 경로는 기존 JSON 파싱에 영향 없음)
  app.use(
    '/api/livekit/webhook',
    express.raw({ type: '*/*' }),
    (req: express.Request & { rawBody?: Buffer }, _res: express.Response, next: express.NextFunction) => {
      if (Buffer.isBuffer(req.body) && !req.rawBody) {
        req.rawBody = req.body
      }
      next()
    },
  )

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
