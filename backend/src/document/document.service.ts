// backend/src/document/document.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHocuspocusServer } from './hocuspocus.server';
import { Page } from './entities/page.entity';
import { PageVersion } from './entities/page-version.entity';
import { Storage } from '@google-cloud/storage'; // 이미 package.json에 있음

@Injectable()
export class DocumentService implements OnModuleInit {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Page) private pageRepository: Repository<Page>,
    @InjectRepository(PageVersion)
    private pageVersionRepository: Repository<PageVersion>,
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

  async getVersions(pageId: string) {
    return this.pageVersionRepository.find({
      where: { page: { id: pageId } },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
