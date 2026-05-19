import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveKitController } from './livekit.controller';
import { LiveKitService } from './livekit.service';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { MeetingParticipant } from '../meetings/entities/meeting-participant.entity';
import { MeetingTranscript } from '../meetings/entities/meeting-transcript.entity';
import { MeetingSummary } from '../meetings/entities/meeting-summary.entity';
import { MeetingActionItem } from '../meetings/entities/meeting-action-item.entity';
import { Channel } from '../channels/entities/channel.entity';
import { ChannelMember } from '../channels/entities/channel-member.entity';
import { SummaryService } from '../meetings/summary.service';

// GuestModule → LiveKitModule → MeetingsModule 순환 참조를 방지하기 위해
// MeetingsModule 전체를 import하지 않고 필요한 entity/service를 직접 등록한다.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupMember,
      Meeting,
      MeetingParticipant,
      MeetingTranscript,
      MeetingSummary,
      MeetingActionItem,
      Channel,
      ChannelMember,
    ]),
  ],
  controllers: [LiveKitController],
  providers: [LiveKitService, SummaryService],
  exports: [LiveKitService],
})
export class LiveKitModule {}
