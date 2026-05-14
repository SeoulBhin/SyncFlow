import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { Message } from '../messages/entities/message.entity';
import { CreateChannelDto } from './dto/create-channel.dto';

/** 6자리 대문자 영숫자 초대 코드 발급기 (혼동 가능 문자 0/O, 1/I 제외) */
const generateInviteCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export interface ChannelWithUnread extends Channel {
  unreadCount: number;
  /** DM 채널의 경우, 현재 사용자 입장에서 상대방 정보 (사이드바 표시용) */
  otherUser?: { userId: string; userName: string } | null;
}

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    @InjectRepository(ChannelMember)
    private readonly memberRepo: Repository<ChannelMember>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async getGroupChannels(
    groupId: string,
    userId: string,
  ): Promise<ChannelWithUnread[]> {
    const allChannels = await this.channelRepo.find({
      where: { groupId },
      order: { createdAt: 'ASC' },
    });

    if (allChannels.length === 0) return [];

    // Batch-load: 본인의 ChannelMember (unread 계산용) + DM 채널의 모든 멤버 (상대방 정보용)
    const channelIds = allChannels.map((c) => c.id);
    const myMembers = await this.memberRepo.find({
      where: { channelId: In(channelIds), userId },
    });
    const myMemberMap = new Map(myMembers.map((m) => [m.channelId, m]));

    // ── 가시성 필터 ──
    // 일반 채널(type='channel') / 프로젝트 채널(type='project'): 그룹 멤버 누구나 노출
    //   → 프로젝트 채팅은 프로젝트 단위 공개 (그룹 멤버 모두 진입 가능)
    // DM(type='dm'): 본인이 ChannelMember여야만 노출
    //   → 사용자가 DM을 leave하면 즉시 사라짐 (삭제 영구화)
    const channels = allChannels.filter((c) => {
      if (c.type === 'dm') return myMemberMap.has(c.id);
      return true;
    });

    if (channels.length === 0) return [];

    // DM 채널만 골라서 모든 멤버 fetch (상대방 식별)
    const dmChannelIds = channels.filter((c) => c.type === 'dm').map((c) => c.id);
    const dmAllMembers =
      dmChannelIds.length > 0
        ? await this.memberRepo.find({ where: { channelId: In(dmChannelIds) } })
        : [];
    const dmMembersByChannel = new Map<string, ChannelMember[]>();
    for (const m of dmAllMembers) {
      const arr = dmMembersByChannel.get(m.channelId) ?? [];
      arr.push(m);
      dmMembersByChannel.set(m.channelId, arr);
    }

    // Count unread messages per channel in parallel
    const withUnread = await Promise.all(
      channels.map(async (ch) => {
        const member = myMemberMap.get(ch.id);
        const lastReadAt = member?.lastReadAt ?? null;

        const qb = this.messageRepo
          .createQueryBuilder('m')
          .where('m.channelId = :channelId', { channelId: ch.id })
          .andWhere('m.authorId != :userId', { userId }) // own messages don't count as unread
          .andWhere('m.parentId IS NULL'); // top-level messages only

        if (lastReadAt) {
          qb.andWhere('m.createdAt > :lastReadAt', { lastReadAt });
        }
        // If lastReadAt is null (never read), all messages count as unread

        const unreadCount = await qb.getCount();

        // DM 채널은 본인 입장에서 상대방 멤버 정보를 같이 반환
        let otherUser: { userId: string; userName: string } | null = null;
        if (ch.type === 'dm') {
          const allMembers = dmMembersByChannel.get(ch.id) ?? [];
          const other = allMembers.find((m) => m.userId !== userId);
          if (other) {
            otherUser = { userId: other.userId, userName: other.userName };
          }
        }

        return { ...ch, unreadCount, otherUser };
      }),
    );

    return withUnread;
  }

  async createChannel(
    dto: CreateChannelDto,
    userId: string,
    userName: string,
  ): Promise<Channel> {
    const type = dto.type ?? 'channel';

    // DM 자기 자신과의 채널 방어 — 백엔드 차원에서 거부
    if (type === 'dm') {
      this.logger.debug(
        `createChannel DM: requestUserId=${userId} targetUserId=${dto.targetUserId} isSelf=${dto.targetUserId === userId}`,
      );
    }
    if (type === 'dm' && dto.targetUserId === userId) {
      throw new ForbiddenException('자신과는 DM을 만들 수 없습니다');
    }

    // DM 같은 사람과 이미 채널이 있으면 중복 생성하지 않고 그걸 반환
    if (type === 'dm' && dto.targetUserId) {
      const existing = await this.findExistingDm(dto.groupId, userId, dto.targetUserId);
      if (existing) return existing;
    }

    // 일반 채널만 초대 코드 발급. DM/프로젝트는 null.
    const inviteCode = type === 'channel' ? await this.issueUniqueInviteCode() : null;

    const channel = this.channelRepo.create({
      groupId: dto.groupId,
      type,
      name: dto.name,
      description: dto.description ?? null,
      inviteCode,
    });
    const saved = await this.channelRepo.save(channel);

    // Creator auto-joins
    await this.memberRepo.save(
      this.memberRepo.create({ channelId: saved.id, userId, userName }),
    );

    // DM: also add the other participant (위에서 self-DM은 이미 차단됨)
    if (type === 'dm' && dto.targetUserId) {
      await this.memberRepo.save(
        this.memberRepo.create({
          channelId: saved.id,
          userId: dto.targetUserId,
          userName: dto.targetUserName ?? '',
        }),
      );
    }

    return saved;
  }

  /**
   * 같은 두 사용자가 같은 그룹에 이미 1:1 DM 채널이 있는지 찾는다.
   * 양쪽 모두 멤버로 등록된 type='dm' 채널이 있으면 그걸 반환.
   */
  private async findExistingDm(
    groupId: string,
    userIdA: string,
    userIdB: string,
  ): Promise<Channel | null> {
    const candidates = await this.channelRepo
      .createQueryBuilder('c')
      .innerJoin('channel_members', 'ma', 'ma.channel_id = c.id AND ma.user_id = :a', {
        a: userIdA,
      })
      .innerJoin('channel_members', 'mb', 'mb.channel_id = c.id AND mb.user_id = :b', {
        b: userIdB,
      })
      .where('c.group_id = :groupId', { groupId })
      .andWhere("c.type = 'dm'")
      .getMany();
    return candidates[0] ?? null;
  }

  /** 본인이 채널에서 나감 (DM은 양쪽 모두 나가면 채널 자동 삭제) */
  async leaveChannel(channelId: string, userId: string): Promise<void> {
    const channel = await this.findOne(channelId);
    const member = await this.memberRepo.findOne({ where: { channelId, userId } });
    if (!member) {
      throw new NotFoundException('채널 멤버가 아닙니다');
    }
    await this.memberRepo.remove(member);

    // DM 채널의 마지막 멤버가 나가면 채널 자체 삭제 (다른 멤버에게도 자동 정리)
    if (channel.type === 'dm') {
      const remaining = await this.memberRepo.count({ where: { channelId } });
      if (remaining === 0) {
        await this.channelRepo.delete(channelId);
      }
    }
  }

  /** 채널 멤버 목록 — 호출자가 멤버여야만 조회 가능 */
  async getMembers(channelId: string, userId: string) {
    await this.ensureMember(channelId, userId);
    return this.memberRepo.find({
      where: { channelId },
      order: { joinedAt: 'ASC' },
    });
  }

  /** 채널 이름/설명 수정 — 채널 멤버 누구나 가능 (단순화) */
  async updateChannel(
    channelId: string,
    userId: string,
    dto: { name?: string; description?: string | null },
  ): Promise<Channel> {
    const channel = await this.findOne(channelId);
    await this.ensureMember(channelId, userId);
    if (dto.name !== undefined) channel.name = dto.name;
    if (dto.description !== undefined) channel.description = dto.description;
    return this.channelRepo.save(channel);
  }

  /** 채널 멤버 제거 — 호출자가 멤버여야 가능 (DM은 self-leave만, 다른 사람 제거 불가) */
  async removeMember(
    channelId: string,
    targetUserId: string,
    callerUserId: string,
  ): Promise<void> {
    const channel = await this.findOne(channelId);
    await this.ensureMember(channelId, callerUserId);
    if (channel.type === 'dm') {
      throw new ForbiddenException('DM 채널은 다른 멤버를 제거할 수 없습니다');
    }
    const target = await this.memberRepo.findOne({
      where: { channelId, userId: targetUserId },
    });
    if (!target) throw new NotFoundException('채널 멤버가 아닙니다');
    await this.memberRepo.remove(target);
  }

  /** 채널 삭제 (DM은 본인이 나가는 leaveChannel을, 일반 채널은 호스트/관리자만) */
  async deleteChannel(channelId: string, userId: string): Promise<void> {
    const channel = await this.findOne(channelId);
    if (channel.type === 'dm') {
      // DM은 본인 leave로 처리
      return this.leaveChannel(channelId, userId);
    }
    // 일반 채널: 멤버 권한 체크는 단순히 채널 멤버여야 가능 (group owner/admin 권한은 향후)
    await this.ensureMember(channelId, userId);
    await this.channelRepo.delete(channelId);
  }

  async markRead(channelId: string, userId: string): Promise<{ unreadCount: number }> {
    let member = await this.memberRepo.findOne({
      where: { channelId, userId },
    });

    if (!member) {
      // Auto-create membership if not exists (can happen in edge cases)
      member = this.memberRepo.create({ channelId, userId, userName: '' });
    }

    member.lastReadAt = new Date();
    await this.memberRepo.save(member);

    return { unreadCount: 0 };
  }

  async ensureMember(channelId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { channelId, userId },
    });
    if (!member) {
      throw new ForbiddenException('채널 멤버가 아닙니다');
    }
  }

  async joinChannel(
    channelId: string,
    userId: string,
    userName: string,
  ): Promise<void> {
    await this.findOne(channelId); // 404 if channel doesn't exist
    const existing = await this.memberRepo.findOne({
      where: { channelId, userId },
    });
    if (!existing) {
      await this.memberRepo.save(
        this.memberRepo.create({ channelId, userId, userName }),
      );
    }
  }

  /** 채널 멤버 다중 추가. 호출자가 채널 멤버여야 함. 이미 가입한 사용자는 skip. */
  async addMembers(
    channelId: string,
    members: { userId: string; userName: string }[],
    callerUserId: string,
  ): Promise<void> {
    await this.ensureMember(channelId, callerUserId);
    if (members.length === 0) return;
    const userIds = members.map((m) => m.userId);
    const existing = await this.memberRepo.find({
      where: { channelId, userId: In(userIds) },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const toInsert = members
      .filter((m) => !existingIds.has(m.userId))
      .map((m) =>
        this.memberRepo.create({
          channelId,
          userId: m.userId,
          userName: m.userName ?? '',
        }),
      );
    if (toInsert.length > 0) {
      await this.memberRepo.save(toInsert);
    }
  }

  async findOne(id: string): Promise<Channel> {
    const ch = await this.channelRepo.findOne({ where: { id } });
    if (!ch) throw new NotFoundException('채널을 찾을 수 없습니다');
    return ch;
  }

  /** 초대 코드로 채널 참여. 잘못된 코드면 NotFoundException. */
  async joinByCode(
    code: string,
    userId: string,
    userName: string,
  ): Promise<Channel> {
    const normalized = code.trim().toUpperCase();
    const channel = await this.channelRepo.findOne({
      where: { inviteCode: normalized },
    });
    if (!channel) {
      throw new NotFoundException('잘못된 초대 코드입니다');
    }
    await this.joinChannel(channel.id, userId, userName);
    return channel;
  }

  /** 충돌 회피하면서 6자리 초대 코드 발급. 최대 5회 재시도. */
  private async issueUniqueInviteCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = generateInviteCode();
      const exists = await this.channelRepo.exist({ where: { inviteCode: code } });
      if (!exists) return code;
    }
    throw new Error('초대 코드 발급에 실패했습니다');
  }
}
