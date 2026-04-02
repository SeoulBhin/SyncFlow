// backend/src/document/document.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import { createHocuspocusServer } from './hocuspocus.server'
import { Page } from './entities/page.entity'
import { PageVersion } from './entities/page-version.entity'
import { Storage } from '@google-cloud/storage'  // 이미 package.json에 있음

@Injectable()
export class DocumentService implements OnModuleInit {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Page) private pageRepository: Repository<Page>,
    @InjectRepository(PageVersion) private pageVersionRepository: Repository<PageVersion>,
  ) {}

  onModuleInit() {
    const server = createHocuspocusServer(this.jwtService, this.pageRepository, this.pageVersionRepository)
    server.listen()
    console.log('Hocuspocus 서버 시작! (포트 1234)')
  }

  async uploadToGCS(file: Express.Multer.File): Promise<string> {
  const storage = new Storage()
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME)
  const fileName = `documents/${Date.now()}-${file.originalname}`
  const blob = bucket.file(fileName)

  await blob.save(file.buffer, { contentType: file.mimetype })

  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`
  }
}

