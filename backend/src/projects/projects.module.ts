import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'
import { Project } from './entities/project.entity'
import { ProjectMember } from './entities/project-member.entity'
import { GroupMember } from '../groups/entities/group-member.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, GroupMember]),
    AuthModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
