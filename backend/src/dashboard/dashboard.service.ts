import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import { ChannelMember } from '../channels/entities/channel-member.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { Message } from '../messages/entities/message.entity';
import { Page } from '../pages/entities/page.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
    @InjectRepository(ChannelMember)
    private memberRepo: Repository<ChannelMember>,
    @InjectRepository(Meeting) private meetingRepo: Repository<Meeting>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Page) private pageRepo: Repository<Page>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
  ) {}

  async getDashboard(userId: string, orgId?: string) {
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

    const scoped = memberships.filter((m) => {
      if (m.channel == null) return false;
      if (orgId && m.channel.groupId !== orgId) return false;
      // 대시보드 "내 채널" 카드에는 부서/팀 채널만. DM은 별도 영역(메시지 탭/사이드바)
      if (m.channel.type === 'dm') return false;
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

    const pages = await this.pageRepo.find({
      where: { createdBy: userId },
      order: { updatedAt: 'DESC' },
      take: 7,
    });

    return pages.map((p) => ({
      id: p.id,
      name: p.title ?? '제목 없음',
      type: p.type === 'code' ? 'code' : 'doc',
      groupName: '',
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

  async searchResources(
    userId: string,
    q: string,
  ): Promise<Array<{ id: string; type: string; title: string; subtitle?: string; path?: string }>> {
    if (!q.trim()) return []
    const pattern = `%${q.trim()}%`

    const [channelRows, pageRows, projectRows] = await Promise.all([
      // 채널: 사용자가 멤버인 채널(DM 제외)
      this.memberRepo
        .createQueryBuilder('cm')
        .innerJoin('cm.channel', 'c')
        .select(['c.id AS id', 'c.name AS name', 'c.description AS description'])
        .where('cm.userId = :userId', { userId })
        .andWhere("c.type != 'dm'")
        .andWhere('LOWER(c.name) LIKE LOWER(:pattern)', { pattern })
        .limit(10)
        .getRawMany<{ id: string; name: string; description: string | null }>(),

      // 페이지: 사용자가 만든 페이지
      this.pageRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.title AS title', 'p.type AS type'])
        .where('p.createdBy = :userId', { userId })
        .andWhere('LOWER(p.title) LIKE LOWER(:pattern)', { pattern })
        .limit(10)
        .getRawMany<{ id: string; title: string; type: string }>(),

      // 프로젝트: 그룹 내 프로젝트
      this.projectRepo
        .createQueryBuilder('pr')
        .select(['pr.id AS id', 'pr.name AS name', 'pr.description AS description'])
        .where('LOWER(pr.name) LIKE LOWER(:pattern)', { pattern })
        .limit(10)
        .getRawMany<{ id: string; name: string; description: string | null }>(),
    ])

    const results: Array<{ id: string; type: string; title: string; subtitle?: string; path?: string }> = []

    for (const ch of channelRows) {
      results.push({
        id: ch.id,
        type: 'channel',
        title: ch.name,
        subtitle: ch.description ?? undefined,
        path: `/app/channel/${ch.id}`,
      })
    }

    for (const pg of pageRows) {
      results.push({
        id: pg.id,
        type: 'page',
        title: pg.title ?? '제목 없음',
        path: pg.type === 'code' ? `/app/code/${pg.id}` : `/app/editor/${pg.id}`,
      })
    }

    for (const pr of projectRows) {
      results.push({
        id: pr.id,
        type: 'project',
        title: pr.name,
        subtitle: pr.description ?? undefined,
      })
    }

    return results
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
