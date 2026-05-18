import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { ConfigService } from '@nestjs/config'
import { MessagesService } from './messages.service'
import { AiService } from '../ai/ai.service'

interface SocketUser {
  userId: string
  userName: string
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server

  private readonly users = new Map<string, SocketUser>()

  constructor(
    private readonly messagesService: MessagesService,
    private readonly config: ConfigService,
    private readonly aiService: AiService,
  ) {}

  handleConnection(client: Socket) {
    const userId =
      (client.handshake.auth['userId'] as string | undefined) ||
      (client.handshake.headers['x-user-id'] as string | undefined) ||
      `anon-${client.id.slice(0, 6)}`
    const userName =
      (client.handshake.auth['userName'] as string | undefined) ||
      (client.handshake.headers['x-user-name'] as string | undefined) ||
      'Unknown'
    this.users.set(client.id, { userId, userName })
  }

  handleDisconnect(client: Socket) {
    this.users.delete(client.id)
  }

  @SubscribeMessage('chat:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    void client.join(data.channelId)
    return { ok: true }
  }

  @SubscribeMessage('chat:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    void client.leave(data.channelId)
    return { ok: true }
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { channelId: string; content: string; parentId?: string },
  ) {
    const user = this.users.get(client.id)
    if (!user) {
      client.emit('chat:error', { message: '인증되지 않은 소켓입니다' })
      return
    }

    try {
      const message = await this.messagesService.createMessage(
        data.channelId,
        { content: data.content, parentId: data.parentId },
        user.userId,
        user.userName,
      )

      this.server.to(data.channelId).emit('chat:message', { message })

      if (/[@＠]AI/i.test(data.content)) {
        this.handleAIResponse(data.channelId, data.content, message.id, user.userId)
      }
    } catch {
      client.emit('chat:error', { message: '메시지 전송에 실패했습니다' })
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = this.users.get(client.id)
    if (!user) return
    client.to(data.channelId).emit('chat:typing', {
      channelId: data.channelId,
      userId: user.userId,
      userName: user.userName,
    })
  }

  @SubscribeMessage('chat:reaction')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { messageId: string; emoji: string; channelId: string },
  ) {
    const user = this.users.get(client.id)
    if (!user) return

    try {
      const reactions = await this.messagesService.addReaction(
        data.messageId,
        { emoji: data.emoji },
        user.userId,
      )
      this.server.to(data.channelId).emit('chat:reaction', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: user.userId,
        reactions,
      })
    } catch {
      client.emit('chat:error', { message: '반응 추가에 실패했습니다' })
    }
  }

  broadcastToChannel(channelId: string, event: string, payload: unknown) {
    this.server.to(channelId).emit(event, payload)
  }

  /**
   * @AI 멘션 처리 — 실제 Gemini 호출
   * 타이핑 인디케이터 → AI 응답 → 메시지 저장 → 브로드캐스트
   */
  handleAIResponse(
    channelId: string,
    content: string,
    parentId: string,
    userId?: string,
  ) {
    // 타이핑 인디케이터 즉시 전송
    this.server.to(channelId).emit('chat:typing', {
      channelId,
      userId: 'ai-system',
      userName: 'AI 어시스턴트',
    })

    void (async () => {
      try {
        const query = content.replace(/[@＠]AI\s*/gi, '').trim()
        if (!query) return

        // 실제 AI 호출 (quickReply: 세션 없이 단발성)
        const aiReply = await this.aiService.quickReply(query, {
          channelId,
        })

        const aiMsg = await this.messagesService.createSystemMessage(
          channelId,
          `**AI 어시스턴트:** ${aiReply}`,
          parentId,
        )

        this.server.to(channelId).emit('chat:message', { message: aiMsg })
      } catch (err) {
        // AI 오류 시 사용자에게 알림
        try {
          const errMsg = await this.messagesService.createSystemMessage(
            channelId,
            '**AI 어시스턴트:** 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            parentId,
          )
          this.server.to(channelId).emit('chat:message', { message: errMsg })
        } catch {
          // ignore
        }
      }
    })()
  }
}
