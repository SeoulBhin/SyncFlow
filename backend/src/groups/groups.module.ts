import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'
import { Group } from './entities/group.entity'
import { GroupMember } from './entities/group-member.entity'
import { InviteCode } from './entities/invite-code.entity'
import { GroupMemberGuard } from './guards/group-member.guard'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, InviteCode]),
    AuthModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupMemberGuard],
  exports: [GroupsService, GroupMemberGuard, TypeOrmModule],
})
export class GroupsModule {}
