import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Channel } from '../channels/entities/channel.entity';
import { ChannelMember } from '../channels/entities/channel-member.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { Message } from '../messages/entities/message.entity';
import { Page } from '../pages/entities/page.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../auth/entities/user.entity';
import { GroupMember } from '../groups/entities/group-member.entity';

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
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(GroupMember) private groupMemberRepo: Repository<GroupMember>,
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
      if (m.channel.type === 'project') return false; // 프로젝트 채팅방은 프로젝트 섹션에서만 접근
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
        groupId: m.channel.groupId,
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
    // q 가 비어있어도 사용자 관련 최근 항목을 반환해 검색 모달의 카테고리 탭이 의미있게 동작하게 한다.
    const trimmed = q.trim()
    const hasQuery = trimmed.length > 0
    const pattern = hasQuery ? `%${trimmed}%` : null

    const channelQb = this.memberRepo
      .createQueryBuilder('cm')
      .innerJoin('cm.channel', 'c')
      .select(['c.id AS id', 'c.name AS name', 'c.description AS description'])
      .where('cm.userId = :userId', { userId })
      .andWhere("c.type != 'dm'")
      .orderBy('c.createdAt', 'DESC')
      .limit(10)
    if (pattern) channelQb.andWhere('LOWER(c.name) LIKE LOWER(:pattern)', { pattern })

    const pageQb = this.pageRepo
      .createQueryBuilder('p')
      .select(['p.id AS id', 'p.title AS title', 'p.type AS type'])
      .where('p.createdBy = :userId', { userId })
      .orderBy('p.updatedAt', 'DESC')
      .limit(10)
    if (pattern) pageQb.andWhere('LOWER(p.title) LIKE LOWER(:pattern)', { pattern })

    const projectQb = this.projectRepo
      .createQueryBuilder('pr')
      .select(['pr.id AS id', 'pr.name AS name', 'pr.description AS description'])
      .orderBy('pr.createdAt', 'DESC')
      .limit(10)
    if (pattern) projectQb.andWhere('LOWER(pr.name) LIKE LOWER(:pattern)', { pattern })

    // 작업: 사용자가 assignee 또는 creator
    const taskQb = this.taskRepo
      .createQueryBuilder('t')
      .select(['t.id AS id', 't.title AS title', 't.status AS status', 't.dueDate AS "dueDate"'])
      .where('(t.assigneeId = :userId OR t.createdBy = :userId)', { userId })
      .orderBy('t.createdAt', 'DESC')
      .limit(10)
    if (pattern) taskQb.andWhere('LOWER(t.title) LIKE LOWER(:pattern)', { pattern })

    // 회의: 사용자가 호스트 또는 참여한 회의 (간단히 host 기준 + 참여자 join)
    const meetingQb = this.meetingRepo
      .createQueryBuilder('m')
      .select(['m.id AS id', 'm.title AS title', 'm.startedAt AS "startedAt"'])
      .where('m.hostId = :userId', { userId })
      .orderBy('m.createdAt', 'DESC')
      .limit(10)
    if (pattern) meetingQb.andWhere('LOWER(m.title) LIKE LOWER(:pattern)', { pattern })

    // 멤버: 사용자가 속한 그룹의 다른 멤버
    const memberQb = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id AS id', 'u.name AS name', 'u.email AS email'])
      .innerJoin(
        'group_members',
        'gm',
        'gm.user_id = u.id AND gm.group_id IN (SELECT group_id FROM group_members WHERE user_id = :userId)',
        { userId },
      )
      .where('u.id <> :userId', { userId })
      .limit(15)
    if (pattern) memberQb.andWhere('(LOWER(u.name) LIKE LOWER(:pattern) OR LOWER(u.email) LIKE LOWER(:pattern))', { pattern })

    // 메시지: 사용자가 멤버인 채널의 메시지. 빈 쿼리에선 너무 많아 검색어 있을 때만 동작.
    const messageQb = pattern
      ? this.messageRepo
          .createQueryBuilder('msg')
          .select(['msg.id AS id', 'msg.content AS content', 'msg.channelId AS "channelId"', 'msg.authorName AS "authorName"'])
          .innerJoin('channel_members', 'cm', 'cm.channel_id = msg.channel_id AND cm.user_id = :userId', { userId })
          .where('LOWER(msg.content) LIKE LOWER(:pattern)', { pattern })
          .orderBy('msg.createdAt', 'DESC')
          .limit(10)
      : null

    const [channelRows, pageRows, projectRows, taskRows, meetingRows, memberRows, messageRows] = await Promise.all([
      channelQb.getRawMany<{ id: string; name: string; description: string | null }>(),
      pageQb.getRawMany<{ id: string; title: string; type: string }>(),
      projectQb.getRawMany<{ id: string; name: string; description: string | null }>(),
      taskQb.getRawMany<{ id: string; title: string; status: string; dueDate: string | null }>(),
      meetingQb.getRawMany<{ id: string; title: string; startedAt: string | null }>(),
      memberQb.getRawMany<{ id: string; name: string; email: string }>(),
      messageQb ? messageQb.getRawMany<{ id: string; content: string; channelId: string; authorName: string }>() : Promise.resolve([]),
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

    for (const t of taskRows) {
      const subtitleParts: string[] = []
      if (t.status) subtitleParts.push(t.status)
      if (t.dueDate) subtitleParts.push(`마감 ${t.dueDate}`)
      results.push({
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: subtitleParts.join(' · ') || undefined,
        path: '/app/tasks',
      })
    }

    for (const m of meetingRows) {
      results.push({
        id: m.id,
        type: 'meeting',
        title: m.title,
        subtitle: m.startedAt ? new Date(m.startedAt).toLocaleDateString('ko-KR') : undefined,
        path: `/app/meetings/${m.id}/summary`,
      })
    }

    for (const u of memberRows) {
      results.push({
        id: u.id,
        type: 'member',
        title: u.name,
        subtitle: u.email,
      })
    }

    for (const msg of messageRows) {
      results.push({
        id: msg.id,
        type: 'message',
        title: msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content,
        subtitle: msg.authorName ? `${msg.authorName} · 메시지` : '메시지',
        path: `/app/channel/${msg.channelId}`,
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
