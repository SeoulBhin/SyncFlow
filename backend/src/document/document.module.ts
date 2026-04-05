// backend/src/document/document.module.ts

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { DocumentService } from './document.service'
import { DocumentController } from './document.controller'
import { Page } from './entities/page.entity'
import { PageVersion } from './entities/page-version.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Page, PageVersion]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
