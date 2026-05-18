import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveKitController } from './livekit.controller';
import { LiveKitService } from './livekit.service';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { MeetingParticipant } from '../meetings/entities/meeting-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GroupMember, Meeting, MeetingParticipant])],
  controllers: [LiveKitController],
  providers: [LiveKitService],
  exports: [LiveKitService],
})
export class LiveKitModule {}
