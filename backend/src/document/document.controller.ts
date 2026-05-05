// backend/src/document/document.controller.ts
import { Controller, Post, Put, Get, Delete, Param, UploadedFile, UseInterceptors, Body, Res, NotFoundException, Req } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { DocumentService } from './document.service'
import type { Request, Response } from 'express'

const FIFTY_MB = 50 * 1024 * 1024

@Controller('document')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
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
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FIFTY_MB }, // 50MB 제한
    }),
  )
  async uploadAttachment(
    @Param('pageId') pageId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new NotFoundException('업로드할 파일이 없습니다.')
    // x-user-id 패턴(JwtAuthGuard 미적용 임시) — 인증 가드 통합 시 req.user.sub 로 대체
    const uploadedBy = (req.headers['x-user-id'] as string | undefined) ?? null
    return this.documentService.uploadAttachment(pageId, file, uploadedBy)
  }

  @Get(':pageId/attachments')
  async listAttachments(@Param('pageId') pageId: string) {
    return this.documentService.getAttachments(pageId)
  }

  @Delete('attachments/:attachmentId')
  async deleteAttachment(@Param('attachmentId') attachmentId: string) {
    return this.documentService.deleteAttachment(attachmentId)
  }

}