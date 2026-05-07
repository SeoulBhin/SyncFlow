// backend/src/document/document.service.ts

import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHocuspocusServer } from './hocuspocus.server';
import { Page } from './entities/page.entity';
import { PageVersion } from './entities/page-version.entity';
import { Attachment } from './entities/attachment.entity';
import { Storage } from '@google-cloud/storage'; // 이미 package.json에 있음

@Injectable()
export class DocumentService implements OnModuleInit {
  constructor(
    private jwtService: JwtService,
    private dataSource: DataSource,
    @InjectRepository(Page) private pageRepository: Repository<Page>,
    @InjectRepository(PageVersion)
    private pageVersionRepository: Repository<PageVersion>,
    @InjectRepository(Attachment)
    private attachmentRepository: Repository<Attachment>,
  ) {}

  onModuleInit() {
    const server = createHocuspocusServer(
      this.jwtService,
      this.pageRepository,
      this.pageVersionRepository,
    );
    server.listen();
    console.log('Hocuspocus 서버 시작! (포트 1234)');
  }

  async uploadToGCS(file: Express.Multer.File): Promise<string> {
    const storage = new Storage();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
    const fileName = `documents/${Date.now()}-${file.originalname}`;
    const blob = bucket.file(fileName);

    await blob.save(file.buffer, { contentType: file.mimetype });

    return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;
  }

  async exportToPdf(htmlContent: string): Promise<Buffer> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();
    return Buffer.from(pdf);
  }

  async exportToDocx(textContent: string): Promise<Buffer> {
    const { Document, Packer, Paragraph } = await import('docx');
    const doc = new Document({
      sections: [
        {
          children: textContent.split('\n').map((line) => new Paragraph(line)),
        },
      ],
    });
    return await Packer.toBuffer(doc);
  }

  async createPage(name: string, type: string): Promise<Page> {
    const page = this.pageRepository.create({ name, type: type || 'doc' })
    return this.pageRepository.save(page)
  }

  async getPage(pageId: string) {
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(pageId)) return null
    return this.pageRepository.findOne({ where: { id: pageId } })
  }

  async getVersions(pageId: string) {
    return this.pageVersionRepository.find({
      where: { page: { id: pageId } },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  // ── 첨부 파일 ──────────────────────────────────────────────

  private readonly UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  async uploadAttachment(
    pageId: string,
    file: Express.Multer.File,
    uploadedBy: string | null,
  ): Promise<Attachment> {
    if (!this.UUID_RE.test(pageId)) {
      throw new NotFoundException('유효하지 않은 페이지 ID 입니다.')
    }

    // GCS 업로드 → DB 저장을 단일 트랜잭션으로. GCS 실패 시 DB 미반영, DB 실패 시 GCS는 보존(soft 정책).
    const url = await this.uploadToGCS(file)

    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Attachment)
      const entity = repo.create({
        pageId,
        filename: file.originalname,
        url,
        mimeType: file.mimetype ?? null,
        size: String(file.size),
        uploadedBy,
      })
      return await repo.save(entity)
    })
  }

  async getAttachments(pageId: string): Promise<Attachment[]> {
    if (!this.UUID_RE.test(pageId)) return []
    return this.attachmentRepository.find({
      where: { pageId },
      order: { createdAt: 'DESC' },
    })
  }

  async deleteAttachment(attachmentId: string): Promise<{ ok: true }> {
    if (!this.UUID_RE.test(attachmentId)) {
      throw new NotFoundException('유효하지 않은 첨부 ID 입니다.')
    }
    const result = await this.attachmentRepository.softDelete({ id: attachmentId })
    if (!result.affected) {
      throw new NotFoundException('첨부 파일을 찾을 수 없습니다.')
    }
    return { ok: true }
  }

  async saveContent(pageId: string, content: string) {
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // mock ID('pg1' 등)는 Postgres UUID 컬럼에 넣으면 오류 — 조용히 스킵
    if (!UUID_RE.test(pageId)) return { ok: true, skipped: true };

    await this.pageRepository.update(pageId, { content });

    // 버전 스냅샷 — 실패해도 저장 응답을 깨뜨리지 않음
    try {
      await this.pageVersionRepository.save({
        page: { id: pageId },
        content,
      });
    } catch {
      // 페이지가 DB에 없는 경우 버전만 건너뜀
    }

    return { ok: true };
  }
}
