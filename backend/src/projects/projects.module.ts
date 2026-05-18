import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'
import { Project } from './entities/project.entity'
import { ProjectMember } from './entities/project-member.entity'
import { GroupMember } from '../groups/entities/group-member.entity'
import { Channel } from '../channels/entities/channel.entity'
import { ChannelMember } from '../channels/entities/channel-member.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, GroupMember, Channel, ChannelMember]),
    AuthModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
