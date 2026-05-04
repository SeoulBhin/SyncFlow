// backend/src/document/document.controller.ts
import { Controller, Post, Put, Get, Param, UploadedFile, UseInterceptors, Body, Res } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { DocumentService } from './document.service'
import type { Response } from 'express'

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

}