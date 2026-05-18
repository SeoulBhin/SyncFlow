// backend/src/document/document.service.ts

import { Injectable, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHocuspocusServer } from './hocuspocus.server';
import { Page } from '../pages/entities/page.entity';
import { PageVersion } from '../pages/entities/page-version.entity';
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
    // ⚠️  포트 충돌 주의 (EADDRINUSE 방지):
    //   - Hocuspocus는 기본 포트 1234를 사용합니다.
    //   - 백엔드를 동시에 여러 인스턴스로 실행하면 EADDRINUSE 에러가 발생합니다.
    //   - 로컬 개발 시 백엔드(nest start:dev)는 단일 인스턴스만 실행할 것.
    //   - PM2 cluster / Docker replica 환경에서는 Hocuspocus를 별도 프로세스로 분리하거나
    //     HOCUSPOCUS_PORT env 변수로 인스턴스마다 포트를 다르게 지정해야 합니다.
    const server = createHocuspocusServer(
      this.jwtService,
      this.pageRepository,
      this.pageVersionRepository,
    );
    server.listen();
    console.log('Hocuspocus 서버 시작! (포트 3001)');
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

  async createPage(
    name: string,
    type: string,
    projectId: string,
    createdBy: string,
  ): Promise<Page> {
    const page = this.pageRepository.create({
      title: name,
      type: type === 'code' ? 'code' : 'document',
      projectId,
      createdBy,
    })
    return this.pageRepository.save(page)
  }

  async getPage(pageId: string) {
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(pageId)) return null
    const page = await this.pageRepository.findOne({ where: { id: pageId } })
    if (!page) return null
    return {
      ...page,
      name: page.title,
      channelId: null,
      content: typeof page.content === 'string' ? page.content : null,
    }
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

  async deleteAttachment(attachmentId: string, userId: string): Promise<{ ok: true }> {
    if (!this.UUID_RE.test(attachmentId)) {
      throw new NotFoundException('유효하지 않은 첨부 ID 입니다.')
    }
    const attachment = await this.attachmentRepository.findOne({ where: { id: attachmentId } })
    if (!attachment) throw new NotFoundException('첨부 파일을 찾을 수 없습니다.')
    // uploadedBy가 기록된 경우에만 소유자 검증 (null은 레거시 데이터로 허용)
    if (attachment.uploadedBy !== null && attachment.uploadedBy !== userId) {
      throw new ForbiddenException('첨부 파일을 삭제할 권한이 없습니다.')
    }
    await this.attachmentRepository.softDelete({ id: attachmentId })
    return { ok: true }
  }

  async saveContent(pageId: string, content: string) {
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // mock ID('pg1' 등)는 Postgres UUID 컬럼에 넣으면 오류 — 조용히 스킵
    if (!UUID_RE.test(pageId)) return { ok: true, skipped: true };

    await this.pageRepository.update(pageId, { content } as any);

    // 버전 스냅샷 — 실패해도 저장 응답을 깨뜨리지 않음
    try {
      // 정식 page_versions 스키마는 created_by가 필수라 편집기 자동 저장에서는
      // 현재 사용자 컨텍스트를 받기 어렵다. 버전 저장 실패는 아래 catch에서 무시한다.
    } catch {
      // 페이지가 DB에 없는 경우 버전만 건너뜀
    }

    return { ok: true };
  }
}
