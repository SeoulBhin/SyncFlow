import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { Message } from '../messages/entities/message.entity';
import { CreateChannelDto } from './dto/create-channel.dto';

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
    const channel = this.channelRepo.create({
      groupId: dto.groupId,
      type: dto.type ?? 'channel',
      name: dto.name,
      description: dto.description ?? null,
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
}
