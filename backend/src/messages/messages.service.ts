import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';

export interface ReactionGroup {
  emoji: string;
  users: string[];
  count: number;
}

export interface MessageResponse {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentId: string | null;
  isSystem: boolean;
  replyCount: number;
  createdAt: string;
  reactions: ReactionGroup[];
}

export interface PaginatedMessages {
  messages: MessageResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepo: Repository<MessageReaction>,
  ) {}

  // ── Queries ────────────────────────────────────────────────────────────────

  async getMessages(
    channelId: string,
    cursor?: string,
    limit = 30,
  ): Promise<PaginatedMessages> {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.reactions', 'r')
      .where('m.channelId = :channelId', { channelId })
      .andWhere('m.parentId IS NULL')
      .orderBy('m.createdAt', 'DESC')
      .take(limit + 1);

    if (cursor) {
      qb.andWhere('m.createdAt < :cursor', {
        cursor: new Date(Number(cursor)),
      });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const messages = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? String(messages[messages.length - 1].createdAt.getTime())
      : null;

    return {
      messages: messages.reverse().map(this.toResponse),
      nextCursor,
      hasMore,
    };
  }

  async getThread(parentId: string): Promise<MessageResponse[]> {
    const rows = await this.messageRepo.find({
      where: { parentId },
      relations: ['reactions'],
      order: { createdAt: 'ASC' },
    });
    return rows.map(this.toResponse);
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  async createMessage(
    channelId: string,
    dto: CreateMessageDto,
    authorId: string,
    authorName: string,
  ): Promise<MessageResponse> {
    const msg = this.messageRepo.create({
      channelId,
      authorId,
      authorName,
      content: dto.content,
      parentId: dto.parentId ?? null,
    });
    const saved = await this.messageRepo.save(msg);

    if (dto.parentId) {
      await this.messageRepo.increment({ id: dto.parentId }, 'replyCount', 1);
    }

    return this.findOneResponse(saved.id);
  }

  async createSystemMessage(
    channelId: string,
    content: string,
    parentId?: string,
  ): Promise<MessageResponse> {
    const msg = this.messageRepo.create({
      channelId,
      authorId: 'ai-system',
      authorName: 'AI 어시스턴트',
      content,
      parentId: parentId ?? null,
      isSystem: true,
    });
    const saved = await this.messageRepo.save(msg);

    if (parentId) {
      await this.messageRepo.increment({ id: parentId }, 'replyCount', 1);
    }

    return this.findOneResponse(saved.id);
  }

  async updateMessage(
    messageId: string,
    content: string,
    userId: string,
  ): Promise<MessageResponse> {
    const msg = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('메시지를 찾을 수 없습니다');
    if (msg.authorId !== userId)
      throw new ForbiddenException('작성자만 수정할 수 있습니다');

    msg.content = content;
    await this.messageRepo.save(msg);
    return this.findOneResponse(messageId);
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const msg = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('메시지를 찾을 수 없습니다');
    if (msg.authorId !== userId)
      throw new ForbiddenException('작성자만 삭제할 수 있습니다');

    await this.messageRepo.remove(msg);

    if (msg.parentId) {
      await this.messageRepo.decrement({ id: msg.parentId }, 'replyCount', 1);
    }
  }

  // ── Reactions ──────────────────────────────────────────────────────────────

  async addReaction(
    messageId: string,
    dto: MessageReactionDto,
    userId: string,
  ): Promise<ReactionGroup[]> {
    const existing = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji: dto.emoji },
    });
    if (!existing) {
      await this.reactionRepo.save(
        this.reactionRepo.create({ messageId, userId, emoji: dto.emoji }),
      );
    }
    return this.getReactionGroups(messageId);
  }

  async removeReaction(
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<ReactionGroup[]> {
    await this.reactionRepo.delete({ messageId, userId, emoji });
    return this.getReactionGroups(messageId);
  }

  async getReactionGroups(messageId: string): Promise<ReactionGroup[]> {
    const reactions = await this.reactionRepo.find({ where: { messageId } });
    const map = new Map<string, string[]>();
    for (const r of reactions) {
      const users = map.get(r.emoji) ?? [];
      users.push(r.userId);
      map.set(r.emoji, users);
    }
    return Array.from(map.entries()).map(([emoji, users]) => ({
      emoji,
      users,
      count: users.length,
    }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async findOneResponse(id: string): Promise<MessageResponse> {
    const msg = await this.messageRepo.findOne({
      where: { id },
      relations: ['reactions'],
    });
    if (!msg) throw new NotFoundException('메시지를 찾을 수 없습니다');
    return this.toResponse(msg);
  }

  private toResponse(msg: Message): MessageResponse {
    const reactionMap = new Map<string, string[]>();
    for (const r of msg.reactions ?? []) {
      const users = reactionMap.get(r.emoji) ?? [];
      users.push(r.userId);
      reactionMap.set(r.emoji, users);
    }
    const reactions: ReactionGroup[] = Array.from(reactionMap.entries()).map(
      ([emoji, users]) => ({ emoji, users, count: users.length }),
    );

    return {
      id: msg.id,
      channelId: msg.channelId,
      authorId: msg.authorId,
      authorName: msg.authorName,
      content: msg.content,
      parentId: msg.parentId,
      isSystem: msg.isSystem,
      replyCount: msg.replyCount,
      createdAt: msg.createdAt.toISOString(),
      reactions,
    };
  }
}
