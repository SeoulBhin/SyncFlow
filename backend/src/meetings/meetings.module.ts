import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MeetingsController } from './meetings.controller'
import { MeetingsService } from './meetings.service'
import { SttService } from './stt.service'
import { SummaryService } from './summary.service'
import { MeetingsGateway } from './meetings.gateway'
import { Meeting } from './entities/meeting.entity'
import { MeetingTranscript } from './entities/meeting-transcript.entity'
import { MeetingSummary } from './entities/meeting-summary.entity'
import { MeetingActionItem } from './entities/meeting-action-item.entity'
import { MeetingParticipant } from './entities/meeting-participant.entity'
import { Task } from '../tasks/entities/task.entity'
import { GroupMember } from '../groups/entities/group-member.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      MeetingTranscript,
      MeetingSummary,
      MeetingActionItem,
      MeetingParticipant,
      Task,
      GroupMember,
    ]),
    // Gateway 에서 JwtService 로 WS 핸드셰이크 토큰 검증
    AuthModule,
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService, SttService, SummaryService, MeetingsGateway],
})
export class MeetingsModule {}
