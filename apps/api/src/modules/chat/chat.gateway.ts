import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from './chat.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private emitChatError(client: Socket, code: string, message: string) {
    client.emit('chat_error', { code, message });
  }

  private emitStreamToRoom(
    room: string,
    event: 'stream_chunk' | 'stream_end' | 'stream_failed',
    payload: Record<string, any>,
  ) {
    this.server.to(room).emit(event, payload);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token
        || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: no token`);
        this.emitChatError(client, 'AUTH_REQUIRED', '请先登录');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET', 'shengri-secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, nickname: true, username: true },
      });

      if (!user) {
        this.emitChatError(client, 'AUTH_FAILED', '用户不存在');
        client.disconnect();
        return;
      }

      client.data.userId = user.id;
      client.data.userName = user.nickname || user.username;
      // Auto-join user notification room
      client.join(`user_${user.id}`);
      this.logger.log(`User ${user.id} connected via WebSocket`);
    } catch (error) {
      this.logger.warn(`WS auth failed: ${error.message}`);
      this.emitChatError(client, 'AUTH_FAILED', '认证失败');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.log(`User ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: number },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      await this.chatService.getSessionById(payload.sessionId, userId);
      const room = `session_${payload.sessionId}`;
      client.join(room);
      client.emit('joined_session', { sessionId: payload.sessionId });
      this.logger.log(`User ${userId} joined room ${room}`);
    } catch (error) {
      this.emitChatError(client, 'JOIN_FAILED', error.message);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: number; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      this.emitChatError(client, 'AUTH_REQUIRED', '请先登录');
      return;
    }

    if (!payload.content?.trim()) {
      this.emitChatError(client, 'INVALID_INPUT', '消息不能为空');
      return;
    }

    const msgId = uuidv4();
    const room = `session_${payload.sessionId}`;
    const joinedRooms = client.rooms || new Set<string>();
    if (!joinedRooms.has(room)) {
      try {
        await this.chatService.getSessionById(payload.sessionId, userId);
        client.join(room);
        client.emit('joined_session', { sessionId: payload.sessionId });
      } catch (error) {
        this.emitChatError(client, 'JOIN_REQUIRED', '会话未就绪，请重新进入对话');
        return;
      }
    }
    const startedAt = Date.now();
    let firstChunkAt = 0;

    try {
      await this.chatService.sendMessageStream(
        userId,
        payload.sessionId,
        payload.content,
        msgId,
        {
          onAccepted: (accepted) => {
            client.emit('message_received', {
              msgId,
              userUuid: accepted.userUuid,
              status: 'processing',
              userMessage: {
                uuid: accepted.userUuid,
                role: 'user',
                content: accepted.userContent,
                createdAt: new Date().toISOString(),
              },
            });
          },
          onChunk: (delta, index) => {
            if (!firstChunkAt) {
              firstChunkAt = Date.now();
              this.logger.log(
                `stream first chunk msgId=${msgId} session=${payload.sessionId} latency_ms=${firstChunkAt - startedAt}`,
              );
            }
            this.emitStreamToRoom(room, 'stream_chunk', { msgId, delta, index });
          },
          onEnd: (result) => {
            this.emitStreamToRoom(room, 'stream_end', {
              msgId,
              assistantUuid: result.assistantUuid,
              fullContent: result.content,
              suggestedQuestions: result.suggestedQuestions,
              tokenUsed: result.tokenUsed,
            });
            this.logger.log(
              `stream completed msgId=${msgId} session=${payload.sessionId} total_ms=${Date.now() - startedAt}`,
            );
          },
          onFailed: (result) => {
            this.emitStreamToRoom(room, 'stream_failed', {
              msgId,
              assistantUuid: result.assistantUuid,
              fullContent: result.content,
            });
          },
          onError: (error) => {
            const timeout = (error.message || '').includes('STREAM_TIMEOUT');
            this.emitChatError(
              client,
              timeout ? 'STREAM_TIMEOUT' : 'AI_ERROR',
              timeout ? '推演超时，请重试' : (error.message || 'AI 服务暂时不可用，请稍后重试'),
            );
            this.logger.warn(
              `stream failed msgId=${msgId} session=${payload.sessionId} elapsed_ms=${Date.now() - startedAt}`,
            );
          },
        },
      );
    } catch (error) {
      this.logger.error(`send_message error: ${error.message}`);
      this.emitChatError(
        client,
        'SEND_FAILED',
        '发送消息失败',
      );
    }
  }

  @SubscribeMessage('feedback')
  async handleFeedback(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageUuid: string; score: number; text?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      this.emitChatError(client, 'AUTH_REQUIRED', '请先登录');
      return;
    }

    if (!payload.messageUuid || ![1, -1].includes(payload.score)) {
      this.emitChatError(client, 'INVALID_INPUT', '反馈参数无效');
      return;
    }

    try {
      const result = await this.chatService.processFeedback(
        userId,
        payload.messageUuid,
        payload.score,
        payload.text,
      );
      client.emit('feedback_received', {
        messageUuid: payload.messageUuid,
        score: payload.score,
        success: true,
      });
    } catch (error) {
      this.logger.error(`feedback error: ${error.message}`);
      this.emitChatError(client, 'FEEDBACK_FAILED', '反馈提交失败');
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: number; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client.to(`session_${payload.sessionId}`).emit('typing', {
      userId,
      isTyping: payload.isTyping,
    });
  }

  // Push notification to a specific user via their user room
  sendNotificationToUser(userId: number, notification: {
    uuid: string;
    type: string;
    title: string;
    body?: string;
    refType?: string;
    refId?: string;
    createdAt: string;
  }) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // ============ Pairing Room Events ============

  @SubscribeMessage('join_pairing_room')
  handleJoinPairingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { requestUuid: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      this.emitChatError(client, 'AUTH_REQUIRED', '请先登录');
      return;
    }
    const room = `pairing_${payload.requestUuid}`;
    client.join(room);
    client.emit('joined_pairing_room', { requestUuid: payload.requestUuid });
    this.logger.log(`User ${userId} joined pairing room ${room}`);
  }

  @SubscribeMessage('send_pairing_message')
  async handleSendPairingMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { requestUuid: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      this.emitChatError(client, 'AUTH_REQUIRED', '请先登录');
      return;
    }

    if (!payload.content?.trim()) {
      this.emitChatError(client, 'INVALID_INPUT', '消息不能为空');
      return;
    }

    const room = `pairing_${payload.requestUuid}`;
    const msgUuid = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const content = payload.content.trim();

    // Find pairing request and both users' sessions for persistence
    try {
      const pairingReq = await this.prisma.pairingRequest.findUnique({
        where: { uuid: payload.requestUuid },
        select: { initiatorId: true, receiverId: true, reportId: true, pairingType: true },
      });

      if (pairingReq?.reportId) {
        // Get user names for personalized titles
        const [u1, u2] = await Promise.all([
          this.prisma.user.findUnique({ where: { id: pairingReq.initiatorId }, select: { nickname: true, username: true } }),
          this.prisma.user.findUnique({ where: { id: pairingReq.receiverId }, select: { nickname: true, username: true } }),
        ]);
        const name1 = u1?.nickname || u1?.username || '用户A';
        const name2 = u2?.nickname || u2?.username || '用户B';

        const typeLabels: Record<string, string> = {
          personality: '性格匹配', career: '事业合作', wealth: '财运互补',
          hehun: '合婚分析', comprehensive: '综合配对',
        };
        const typeLabel = typeLabels[pairingReq.pairingType] || '配对';

        // Ensure both users have chat sessions with personalized titles
        const userSessions = await Promise.all([
          this.prisma.chatSession.upsert({
            where: { userId_reportId: { userId: pairingReq.initiatorId, reportId: pairingReq.reportId } },
            create: {
              userId: pairingReq.initiatorId,
              reportId: pairingReq.reportId,
              title: `与${name2}的${typeLabel}对话`,
              mem0UserId: `user_${pairingReq.initiatorId}`,
              mem0AgentId: 'bazi_advisor_v1',
              lastMessageAt: new Date(),
            },
            update: { lastMessageAt: new Date() },
            select: { id: true },
          }),
          this.prisma.chatSession.upsert({
            where: { userId_reportId: { userId: pairingReq.receiverId, reportId: pairingReq.reportId } },
            create: {
              userId: pairingReq.receiverId,
              reportId: pairingReq.reportId,
              title: `与${name1}的${typeLabel}对话`,
              mem0UserId: `user_${pairingReq.receiverId}`,
              mem0AgentId: 'bazi_advisor_v1',
              lastMessageAt: new Date(),
            },
            update: { lastMessageAt: new Date() },
            select: { id: true },
          }),
        ]);

        // Persist message to ALL sessions (both users)
        // Each session gets its own message copy with a unique UUID
        for (const s of userSessions) {
          const copyUuid = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await this.prisma.chatMessage.create({
            data: {
              sessionId: s.id,
              role: 'user',
              content,
              uuid: copyUuid,
            },
          });
        }
        this.logger.log(`Pairing message persisted: requestUuid=${payload.requestUuid} userId=${userId}`);

        // Send notification to the OTHER user (not the sender)
        const otherUserId = pairingReq.initiatorId === userId
          ? pairingReq.receiverId : pairingReq.initiatorId;
        const senderName = userId === pairingReq.initiatorId ? name1 : name2;

        const notif = await this.prisma.notification.create({
          data: {
            userId: otherUserId,
            type: 'new_message',
            title: `${senderName} 发来新消息`,
            body: content.length > 80 ? content.substring(0, 80) + '...' : content,
            refType: 'pairing_request',
            refId: payload.requestUuid,
          },
        });

        // Push real-time notification to the other user
        this.server.to(`user_${otherUserId}`).emit('notification', {
          uuid: notif.uuid,
          type: 'new_message',
          title: `${senderName} 发来新消息`,
          body: content.length > 80 ? content.substring(0, 80) + '...' : content,
          refType: 'pairing_request',
          refId: payload.requestUuid,
          createdAt: notif.createdAt.toISOString(),
        });
      }
    } catch (err) {
      this.logger.error(`Failed to persist pairing message: ${err.message}`);
    }

    // Broadcast to ALL users in the room (including sender)
    this.server.to(room).emit('pairing_message_received', {
      msgId: msgUuid,
      userMessage: {
        uuid: msgUuid,
        role: 'user',
        content,
        userId,
        createdAt: new Date().toISOString(),
      },
    });
  }

  @SubscribeMessage('pairing_typing')
  handlePairingTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pairingId: number; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client.to(`pairing_${payload.pairingId}`).emit('pairing_typing', {
      userId,
      isTyping: payload.isTyping,
    });
  }
}
