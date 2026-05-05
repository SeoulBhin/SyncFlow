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

  async getDashboard(userId: string, orgId?: string) {
    // 조직 컨텍스트가 주어지면 해당 조직 채널 ID 화이트리스트를 한 번만 계산해서
    // 페이지/회의 쿼리에 재사용한다 (N+1 / 중복 조회 방지).
    const orgChannelIds = orgId ? await this.getChannelIdsByOrg(orgId) : null;

    const [groups, recentPages, upcomingMeetings] = await Promise.all([
      this.getMyChannels(userId, orgId),
      this.getRecentPages(userId, orgChannelIds),
      this.getMyMeetings(userId, orgChannelIds),
    ]);

    return {
      groups,
      recentPages,
      myTasks: [],
      upcomingMeetings,
    };
  }

  private async getChannelIdsByOrg(orgId: string): Promise<string[]> {
    const channels = await this.channelRepo.find({
      where: { groupId: orgId },
      select: ['id'],
    });
    return channels.map((c) => c.id);
  }

  private async getMyChannels(userId: string, orgId?: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['channel'],
    });

    // 조직 격리 — orgId 가 주어지면 해당 워크스페이스 채널만 노출.
    const scoped = memberships.filter((m) => {
      if (m.channel == null) return false;
      if (orgId && m.channel.groupId !== orgId) return false;
      return true;
    });

    const channelIds = scoped.map((m) => m.channelId);

    const latestMessages =
      channelIds.length > 0
        ? await this.messageRepo
            .createQueryBuilder('m')
            .select('m.channelId', 'channelId')
            .addSelect('MAX(m.createdAt)', 'lastAt')
            .where('m.channelId IN (:...ids)', { ids: channelIds })
            .groupBy('m.channelId')
            .getRawMany<{ channelId: string; lastAt: Date }>()
        : [];
    const lastMap = new Map(latestMessages.map((r) => [r.channelId, r.lastAt]));

    // memberCount N+1 회피 — 한 번의 GROUP BY 로 일괄 집계.
    const memberCountRows =
      channelIds.length > 0
        ? await this.memberRepo
            .createQueryBuilder('cm')
            .select('cm.channelId', 'channelId')
            .addSelect('COUNT(*)', 'cnt')
            .where('cm.channelId IN (:...ids)', { ids: channelIds })
            .groupBy('cm.channelId')
            .getRawMany<{ channelId: string; cnt: string }>()
        : [];
    const countMap = new Map(
      memberCountRows.map((r) => [r.channelId, Number(r.cnt)]),
    );

    return scoped.map((m) => {
      const lastAt = lastMap.get(m.channelId) ?? m.channel.createdAt;
      return {
        id: m.channelId,
        name: m.channel.name,
        description: m.channel.description ?? '',
        memberCount: countMap.get(m.channelId) ?? 1,
        lastActivity: this.formatDate(lastAt),
        isExternal: false,
      };
    });
  }

  private async getRecentPages(userId: string, orgChannelIds: string[] | null) {
    if (orgChannelIds && orgChannelIds.length === 0) return [];

    const where: Record<string, unknown> = { createdBy: userId };
    if (orgChannelIds) where.channelId = In(orgChannelIds);

    const pages = await this.pageRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 7,
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

  private async getMyMeetings(userId: string, orgChannelIds: string[] | null) {
    if (orgChannelIds && orgChannelIds.length === 0) return [];

    const baseWhere: Record<string, unknown> = { hostId: userId };
    if (orgChannelIds) baseWhere.groupId = In(orgChannelIds);

    const [scheduled, ended] = await Promise.all([
      this.meetingRepo.find({
        where: { ...baseWhere, status: In(['scheduled', 'in-progress']) },
        order: { createdAt: 'DESC' },
      }),
      this.meetingRepo.find({
        where: { ...baseWhere, status: 'ended' },
        order: { endedAt: 'DESC' },
        take: 3,
      }),
    ]);

    // 회의 → 채널명 매핑 (하나의 쿼리로 일괄 조회)
    const meetingChannelIds = [
      ...new Set(
        [...scheduled, ...ended].map((m) => m.groupId).filter(Boolean) as string[],
      ),
    ];
    const channels =
      meetingChannelIds.length > 0
        ? await this.channelRepo.find({
            where: { id: In(meetingChannelIds) },
          })
        : [];
    const channelNameMap = new Map(channels.map((c) => [c.id, c.name]));

    return [...scheduled, ...ended].map((m) => ({
      id: m.id,
      title: m.title,
      channelName: m.groupId ? (channelNameMap.get(m.groupId) ?? '') : '',
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
