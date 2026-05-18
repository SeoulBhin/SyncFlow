// backend/src/document/document.controller.ts
import { BadRequestException, Controller, Post, Put, Get, Delete, Param, UploadedFile, UseInterceptors, Body, Res, NotFoundException, Req, UseGuards } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import * as path from 'path'
import { DocumentService } from './document.service'
import type { Request, Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator'

const FIFTY_MB = 50 * 1024 * 1024
const TEN_MB   = 10 * 1024 * 1024

// 실행/스크립트/웹 위험 확장자 — 두 업로드 엔드포인트 공통 차단
const BLOCKED_EXTENSIONS = new Set([
  '.svg', '.html', '.htm', '.xhtml',
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.py', '.rb', '.pl', '.lua', '.cgi', '.asp', '.aspx', '.jsp',
  '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1', '.vbs', '.wsf', '.hta',
  '.exe', '.dll', '.so', '.dylib', '.com', '.scr',
])

// ── 이미지 업로드 검증 (문서 에디터 인라인 이미지용) ──────────────────
const IMAGE_ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
])

function validateDocumentImageUpload(
  _req: Request,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new BadRequestException(`허용되지 않는 파일 확장자: ${ext}`), false)
  }
  if (!IMAGE_ALLOWED_MIME.has(file.mimetype)) {
    return cb(new BadRequestException('이미지 파일만 업로드 가능합니다 (png, jpg, webp, gif)'), false)
  }
  cb(null, true)
}

// ── 문서 첨부파일 검증 (페이지 첨부용) ────────────────────────────────
const ATTACHMENT_ALLOWED_MIME = new Set([
  // 이미지
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  // 문서
  'application/pdf',
  'text/plain', 'text/csv', 'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 압축
  'application/zip', 'application/x-zip-compressed', 'application/gzip', 'application/x-tar',
])

function validateDocumentAttachmentUpload(
  _req: Request,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new BadRequestException(`허용되지 않는 파일 확장자: ${ext}`), false)
  }
  if (!ATTACHMENT_ALLOWED_MIME.has(file.mimetype)) {
    return cb(new BadRequestException(`허용되지 않는 파일 형식: ${file.mimetype}`), false)
  }
  cb(null, true)
}

@Controller('document')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPage(
    @Body() body: { name: string; type?: string; projectId?: string },
    @Req() req: Request & { user?: { id?: string; userId?: string } },
  ) {
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const name = body.name?.trim()
    const projectId = body.projectId?.trim()
    const createdBy = req.user?.id ?? req.user?.userId

    if (!name) {
      throw new BadRequestException('페이지명은 필수입니다.')
    }
    if (!projectId || !UUID_RE.test(projectId)) {
      throw new BadRequestException('projectId 는 유효한 UUID 여야 합니다.')
    }
    if (!createdBy || !UUID_RE.test(createdBy)) {
      throw new BadRequestException('인증된 사용자 ID를 확인할 수 없습니다.')
    }

    return this.documentService.createPage(name, body.type ?? 'doc', projectId, createdBy)
  }

  // 문서 에디터 인라인 이미지 업로드 (GCS) — 이미지 파일만 허용
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: TEN_MB },
      fileFilter: validateDocumentImageUpload,
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('파일이 없습니다.')
    const url = await this.documentService.uploadToGCS(file)
    return { url }
  }

  @Post('export/pdf')
  async exportPdf(@Body() body: { content: string }, @Res() res: Response) {
    const pdfBuffer = await this.documentService.exportToPdf(body.content)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=document.pdf')
    res.send(pdfBuffer)
  }

  @Post('export/docx')
  async exportDocx(@Body() body: { content: string }, @Res() res: Response) {
    const docxBuffer = await this.documentService.exportToDocx(body.content)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', 'attachment; filename=document.docx')
    res.send(docxBuffer)
  }

  // 문서 콘텐츠 자동저장 — debounce 후 프론트에서 호출
  @Put(':pageId/content')
  async saveContent(
    @Param('pageId') pageId: string,
    @Body() body: { content: string },
  ) {
    return this.documentService.saveContent(pageId, body.content)
  }

  @Get(':pageId/versions')
  async getVersions(@Param('pageId') pageId: string) {
    return this.documentService.getVersions(pageId)
  }

  @Get(':pageId')
  async getPage(@Param('pageId') pageId: string) {
    const page = await this.documentService.getPage(pageId)
    if (!page) throw new NotFoundException('문서를 찾을 수 없습니다.')
    return page
  }

  // ── 첨부 파일 ──────────────────────────────────────────────

  @Post(':pageId/attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FIFTY_MB },
      fileFilter: validateDocumentAttachmentUpload,
    }),
  )
  async uploadAttachment(
    @Param('pageId') pageId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) throw new NotFoundException('업로드할 파일이 없습니다.')
    return this.documentService.uploadAttachment(pageId, file, user.userId)
  }

  @Get(':pageId/attachments')
  async listAttachments(@Param('pageId') pageId: string) {
    return this.documentService.getAttachments(pageId)
  }

  @Delete('attachments/:attachmentId')
  @UseGuards(JwtAuthGuard)
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.documentService.deleteAttachment(attachmentId, user.userId)
  }

}
