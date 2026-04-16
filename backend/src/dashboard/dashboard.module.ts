import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { Channel } from '../channels/entities/channel.entity'
import { ChannelMember } from '../channels/entities/channel-member.entity'
import { Meeting } from '../meetings/entities/meeting.entity'
import { Page } from '../document/entities/page.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, ChannelMember, Meeting, Page]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
