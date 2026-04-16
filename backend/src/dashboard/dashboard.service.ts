import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ChannelMember } from '../channels/entities/channel-member.entity'
import { Meeting } from '../meetings/entities/meeting.entity'
import { Page } from '../document/entities/page.entity'

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ChannelMember) private memberRepo: Repository<ChannelMember>,
    @InjectRepository(Meeting) private meetingRepo: Repository<Meeting>,
    @InjectRepository(Page) private pageRepo: Repository<Page>,
  ) {}

  async getDashboard(userId: string) {
    const [groups, recentPages, upcomingMeetings] = await Promise.all([
      this.getMyChannels(userId),
      this.getRecentPages(userId),
      this.getMyMeetings(userId),
    ])

    return {
      groups,
      recentPages,
      myTasks: [], // Part 7 완료 후 tasks 테이블 연결
      upcomingMeetings,
    }
  }

  private async getMyChannels(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['channel'],
    })

    return Promise.all(
      memberships
        .filter((m) => m.channel != null)
        .map(async (m) => {
          const memberCount = await this.memberRepo.count({
            where: { channelId: m.channelId },
          })
          return {
            id: m.channelId,
            name: m.channel.name,
            description: m.channel.description ?? '',
            memberCount,
            lastActivity: this.formatDate(m.channel.createdAt),
            isExternal: false,
          }
        }),
    )
  }

  private async getRecentPages(userId: string) {
    const pages = await this.pageRepo.find({
      where: { createdBy: userId },
      order: { updatedAt: 'DESC' },
      take: 5,
    })

    return pages.map((p) => ({
      id: p.id,
      name: p.name ?? '제목 없음',
      type: 'doc',
      groupName: '',
      projectName: '',
      updatedAt: this.formatDate(p.updatedAt),
    }))
  }

  private async getMyMeetings(userId: string) {
    const meetings = await this.meetingRepo.find({
      where: { hostId: userId },
      order: { createdAt: 'DESC' },
      take: 10,
    })

    return meetings.map((m) => ({
      id: m.id,
      title: m.title,
      channelName: '',
      status: m.status,
      scheduledAt: this.formatDate(m.createdAt),
      duration: this.calcDuration(m.startedAt, m.endedAt),
      participants: [],
    }))
  }

  private formatDate(date: Date): string {
    if (!date) return ''
    return new Date(date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  private calcDuration(startedAt: Date | null, endedAt: Date | null): string {
    if (!startedAt || !endedAt) return ''
    const mins = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
    if (mins < 60) return `${mins}분`
    return `${Math.floor(mins / 60)}시간 ${mins % 60}분`
  }
}
