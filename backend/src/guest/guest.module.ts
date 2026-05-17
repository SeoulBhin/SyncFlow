import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GuestController } from './guest.controller'
import { GuestService } from './guest.service'
import { MeetingGuestInvite } from './entities/meeting-guest-invite.entity'
import { Meeting } from '../meetings/entities/meeting.entity'
import { Page } from '../pages/entities/page.entity'
import { Project } from '../projects/entities/project.entity'
import { LiveKitModule } from '../livekit/livekit.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingGuestInvite, Meeting, Page, Project]),
    LiveKitModule, // LiveKitService.generateGuestToken 사용
  ],
  controllers: [GuestController],
  providers: [GuestService],
  exports: [GuestService], // MeetingsModule에서 createGuestInvite 호출
})
export class GuestModule {}
