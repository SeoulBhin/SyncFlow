import {
  Injectable,
  ForbiddenException,
  NotFoundException,
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
}

@Injectable()
export class ChannelsService {
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
    const channels = await this.channelRepo.find({
      where: { groupId },
      order: { createdAt: 'ASC' },
    });

    if (channels.length === 0) return [];

    // Batch-load all ChannelMember records for this user
    const channelIds = channels.map((c) => c.id);
    const members = await this.memberRepo.find({
      where: { channelId: In(channelIds), userId },
    });
    const memberMap = new Map(members.map((m) => [m.channelId, m]));

    // Count unread messages per channel in parallel
    const withUnread = await Promise.all(
      channels.map(async (ch) => {
        const member = memberMap.get(ch.id);
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
        return { ...ch, unreadCount };
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

    // DM: also add the other participant
    if (dto.type === 'dm' && dto.targetUserId) {
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
