import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set([
  // 이미지 (SVG 제외 — XSS 위험)
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // 문서
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 텍스트
  'text/plain',
  'text/csv',
  'text/markdown',
  // XML / 다이어그램 (.drawio 등)
  'application/xml',
  'text/xml',
  'application/vnd.jgraph.mxfile',   // drawio
  // 압축
  'application/zip',
  'application/x-zip-compressed',
  'application/x-tar',
  'application/gzip',
  // application/octet-stream 제거 — MIME 위조로 실행 파일 우회 가능
]);

// 실행/스크립트 파일 확장자 차단 목록 (MIME 위조 우회 방지 이중 검증)
const BLOCKED_EXTENSIONS = new Set([
  // 실행 파일
  '.exe', '.dll', '.so', '.dylib', '.com', '.scr',
  // 셸 / 윈도우 스크립트
  '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1', '.vbs', '.wsf', '.hta',
  // 웹 스크립트 (서버 실행 가능)
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.py', '.rb', '.pl', '.lua', '.cgi', '.asp', '.aspx', '.jsp',
  // 브라우저 실행 가능 (XSS 위험)
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.html', '.htm', '.xhtml', '.svg',
]);

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        if (BLOCKED_EXTENSIONS.has(ext)) {
          return cb(new BadRequestException(`허용되지 않는 파일 확장자: ${ext}`), false);
        }
        if (!ALLOWED_MIME.has(file.mimetype)) {
          return cb(new BadRequestException(`허용되지 않는 파일 형식: ${file.mimetype}`), false);
        }

        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('파일이 없습니다');
    // multer는 multipart 헤더를 latin1로 디코딩함 — 한글 파일명을 UTF-8로 복원
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return {
      fileUrl: `/uploads/${file.filename}`,
      fileName,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
