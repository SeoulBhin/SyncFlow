import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';

interface SocketUser {
  userId: string;
  userName: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  // Vite dev server proxies /socket.io → :3000, so no need to change path
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /** socketId → user info */
  private readonly users = new Map<string, SocketUser>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Connection lifecycle ───────────────────────────────────────────────────

  handleConnection(client: Socket) {
    // 1순위: auth 객체 또는 헤더에서 명시적으로 전달된 userId
    let userId =
      (client.handshake.auth['userId'] as string | undefined) ||
      (client.handshake.headers['x-user-id'] as string | undefined) ||
      '';
    let userName =
      (client.handshake.auth['userName'] as string | undefined) ||
      (client.handshake.headers['x-user-name'] as string | undefined) ||
      'Unknown';

    // 2순위: userId가 비어있으면 JWT 토큰에서 sub(userId) 추출
    // → 인증된 사용자의 authorId가 REST API와 동일하게 유지됨 (403 방지)
    if (!userId) {
      const rawToken =
        (client.handshake.auth['token'] as string | undefined) ||
        (client.handshake.headers['authorization'] as string | undefined)?.replace(
          /^Bearer\s+/i,
          '',
        );
      if (rawToken) {
        try {
          const secret = this.config.get<string>('JWT_SECRET', 'dev-secret');
          const payload = this.jwtService.verify<{ sub: string; name?: string }>(
            rawToken,
            { secret },
          );
          userId = payload.sub;
          userName = payload.name ?? userName;
        } catch {
          // 유효하지 않거나 만료된 토큰 → 3순위(익명)로 fall-through
        }
      }
    }

    // 3순위: 완전 익명 (개발/테스트용)
    if (!userId) {
      userId = `anon-${client.id.slice(0, 6)}`;
    }

    this.users.set(client.id, { userId, userName });
  }

  handleDisconnect(client: Socket) {
    this.users.delete(client.id);
  }

  // ── Room join / leave ──────────────────────────────────────────────────────

  @SubscribeMessage('chat:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    void client.join(data.channelId);
    return { ok: true };
  }

  @SubscribeMessage('chat:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    void client.leave(data.channelId);
    return { ok: true };
  }

  // ── Message send via socket (saves + broadcasts) ───────────────────────────

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { channelId: string; content: string; parentId?: string },
  ) {
    const user = this.users.get(client.id);
    if (!user) {
      client.emit('chat:error', { message: '인증되지 않은 소켓입니다' });
      return;
    }

    try {
      const message = await this.messagesService.createMessage(
        data.channelId,
        { content: data.content, parentId: data.parentId },
        user.userId,
        user.userName,
      );

      this.server.to(data.channelId).emit('chat:message', { message });

      if (/[@＠]AI/i.test(data.content)) {
        this.handleAIResponse(data.channelId, data.content, message.id);
      }
    } catch {
      client.emit('chat:error', { message: '메시지 전송에 실패했습니다' });
    }
  }

  // ── Typing indicator (no DB) ───────────────────────────────────────────────

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = this.users.get(client.id);
    if (!user) return;
    // Broadcast to all others in the room
    client.to(data.channelId).emit('chat:typing', {
      channelId: data.channelId,
      userId: user.userId,
      userName: user.userName,
    });
  }

  // ── Reaction (saves + broadcasts) ─────────────────────────────────────────

  @SubscribeMessage('chat:reaction')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { messageId: string; emoji: string; channelId: string },
  ) {
    const user = this.users.get(client.id);
    if (!user) return;

    try {
      const reactions = await this.messagesService.addReaction(
        data.messageId,
        { emoji: data.emoji },
        user.userId,
      );
      this.server.to(data.channelId).emit('chat:reaction', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: user.userId,
        reactions,
      });
    } catch {
      client.emit('chat:error', { message: '반응 추가에 실패했습니다' });
    }
  }

  // ── Public helpers (called by MessagesController) ─────────────────────────

  broadcastToChannel(channelId: string, event: string, payload: unknown) {
    this.server.to(channelId).emit(event, payload);
  }

  handleAIResponse(channelId: string, content: string, parentId: string) {
    // Fire-and-forget simulated AI reply (replace with real AI service)
    setTimeout(async () => {
      try {
        const query = content.replace(/[@＠]AI/gi, '').trim() || '안녕하세요';
        const aiMsg = await this.messagesService.createSystemMessage(
          channelId,
          `**AI 어시스턴트:** "${query}"에 대해 분석 중입니다. 프로젝트 컨텍스트를 기반으로 답변을 준비하겠습니다.`,
          parentId,
        );
        this.server.to(channelId).emit('chat:message', { message: aiMsg });
      } catch {
        // ignore AI errors
      }
    }, 1500);
  }
}
