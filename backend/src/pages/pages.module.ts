import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PagesController } from './pages.controller'
import { PagesService } from './pages.service'
import { Page } from './entities/page.entity'
import { PageVersion } from './entities/page-version.entity'
import { Project } from '../projects/entities/project.entity'
import { GroupMember } from '../groups/entities/group-member.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Page, PageVersion, Project, GroupMember]),
    AuthModule,
  ],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
