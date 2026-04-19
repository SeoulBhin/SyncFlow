import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import { ChannelMember } from '../channels/entities/channel-member.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { Message } from '../messages/entities/message.entity';
import { Page } from '../document/entities/page.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
    @InjectRepository(ChannelMember)
    private memberRepo: Repository<ChannelMember>,
    @InjectRepository(Meeting) private meetingRepo: Repository<Meeting>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Page) private pageRepo: Repository<Page>,
  ) {}

  async getDashboard(userId: string) {
    const [groups, recentPages, upcomingMeetings] = await Promise.all([
      this.getMyChannels(userId),
      this.getRecentPages(userId),
      this.getMyMeetings(userId),
    ]);

    return {
      groups,
      recentPages,
      myTasks: [],
      upcomingMeetings,
    };
  }

  private async getMyChannels(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['channel'],
    });

    const channelIds = memberships
      .filter((m) => m.channel != null)
      .map((m) => m.channelId);

    // 채널별 최신 메시지 시간을 한 번에 집계 (N+1 방지)
    const latestMessages = channelIds.length > 0
      ? await this.messageRepo
          .createQueryBuilder('m')
          .select('m.channelId', 'channelId')
          .addSelect('MAX(m.createdAt)', 'lastAt')
          .where('m.channelId IN (:...ids)', { ids: channelIds })
          .groupBy('m.channelId')
          .getRawMany<{ channelId: string; lastAt: Date }>()
      : [];
    const lastMap = new Map(latestMessages.map((r) => [r.channelId, r.lastAt]));

    return Promise.all(
      memberships
        .filter((m) => m.channel != null)
        .map(async (m) => {
          const memberCount = await this.memberRepo.count({
            where: { channelId: m.channelId },
          });
          const lastAt = lastMap.get(m.channelId) ?? m.channel.createdAt;
          return {
            id: m.channelId,
            name: m.channel.name,
            description: m.channel.description ?? '',
            memberCount,
            lastActivity: this.formatDate(lastAt),
            isExternal: false,
          };
        }),
    );
  }

  private async getRecentPages(userId: string) {
    const pages = await this.pageRepo.find({
      where: { createdBy: userId },
      order: { updatedAt: 'DESC' },
      take: 5,
    });

    const channelIds = [
      ...new Set(pages.map((p) => p.channelId).filter(Boolean)),
    ] as string[];
    const channels =
      channelIds.length > 0
        ? await this.channelRepo.find({ where: { id: In(channelIds) } })
        : [];
    const channelMap = new Map(channels.map((c) => [c.id, c.name]));

    return pages.map((p) => ({
      id: p.id,
      name: p.name ?? '제목 없음',
      type: 'doc',
      groupName: p.channelId ? (channelMap.get(p.channelId) ?? '') : '',
      projectName: '',
      updatedAt: this.formatDate(p.updatedAt),
    }));
  }

  private async getMyMeetings(userId: string) {
    const [scheduled, ended] = await Promise.all([
      this.meetingRepo.find({
        where: { hostId: userId, status: In(['scheduled', 'in-progress']) },
        order: { createdAt: 'DESC' },
      }),
      this.meetingRepo.find({
        where: { hostId: userId, status: 'ended' },
        order: { endedAt: 'DESC' },
        take: 3,
      }),
    ]);

    return [...scheduled, ...ended].map((m) => ({
      id: m.id,
      title: m.title,
      channelName: '',
      status: m.status,
      scheduledAt: this.formatDate(m.startedAt ?? m.createdAt),
      duration: this.calcDuration(m.startedAt, m.endedAt),
      participants: [],
    }));
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private calcDuration(startedAt: Date | null, endedAt: Date | null): string {
    if (!startedAt || !endedAt) return '';
    const mins = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
    if (mins < 60) return `${mins}분`;
    return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
  }
}
