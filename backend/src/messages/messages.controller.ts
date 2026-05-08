import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { ChannelsService } from '../channels/channels.service';

class UpdateMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly channelsService: ChannelsService,
    private readonly gateway: MessagesGateway,
  ) {}

  /** GET /api/channels/:channelId/messages?cursor=&limit= */
  @Get('channels/:channelId/messages')
  async getMessages(
    @Param('channelId') channelId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    if (user?.userId) {
      await this.channelsService.ensureMember(channelId, user.userId);
    }
    return this.messagesService.getMessages(
      channelId,
      cursor,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  /** POST /api/channels/:channelId/messages */
  @Post('channels/:channelId/messages')
  async createMessage(
    @Param('channelId') channelId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.channelsService.ensureMember(channelId, user.userId);
    const message = await this.messagesService.createMessage(
      channelId,
      dto,
      user.userId,
      user.userName,
    );

    // Broadcast via Socket.IO so other clients receive it in real time
    this.gateway.broadcastToChannel(channelId, 'chat:message', { message });

    // Handle @AI mention
    if (/[@＠]AI/i.test(dto.content)) {
      this.gateway.handleAIResponse(channelId, dto.content, message.id);
    }

    return message;
  }

  /** PUT /api/messages/:messageId */
  @Put('messages/:messageId')
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const message = await this.messagesService.updateMessage(
      messageId,
      dto.content,
      user.userId,
    );
    this.gateway.broadcastToChannel(message.channelId, 'chat:message:updated', {
      message,
    });
    return message;
  }

  /** DELETE /api/messages/:messageId */
  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Load before delete to get channelId
    const msg = await this.messagesService['findOneResponse'](messageId).catch(
      () => null,
    );
    await this.messagesService.deleteMessage(messageId, user.userId);
    if (msg) {
      this.gateway.broadcastToChannel(msg.channelId, 'chat:message:deleted', {
        messageId,
        channelId: msg.channelId,
      });
    }
    return { success: true };
  }

  /** GET /api/messages/:messageId/thread */
  @Get('messages/:messageId/thread')
  getThread(@Param('messageId') messageId: string) {
    return this.messagesService.getThread(messageId);
  }

  /** POST /api/messages/:messageId/reactions */
  @Post('messages/:messageId/reactions')
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() dto: MessageReactionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const reactions = await this.messagesService.addReaction(
      messageId,
      dto,
      user.userId,
    );
    // Need channelId to broadcast — load the message
    const msg = await this.messagesService['findOneResponse'](messageId);
    this.gateway.broadcastToChannel(msg.channelId, 'chat:reaction', {
      messageId,
      emoji: dto.emoji,
      userId: user.userId,
      reactions,
    });
    return reactions;
  }

  /** DELETE /api/messages/:messageId/reactions/:emoji */
  @Delete('messages/:messageId/reactions/:emoji')
  async removeReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const reactions = await this.messagesService.removeReaction(
      messageId,
      emoji,
      user.userId,
    );
    const msg = await this.messagesService['findOneResponse'](messageId);
    this.gateway.broadcastToChannel(msg.channelId, 'chat:reaction', {
      messageId,
      emoji,
      userId: user.userId,
      reactions,
    });
    return reactions;
  }
}
