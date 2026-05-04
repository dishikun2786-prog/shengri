import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateSessionDto, GetMessagesDto } from './chat.dto';

@ApiTags('聊天')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('session')
  @ApiOperation({ summary: '创建/获取会话' })
  createSession(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateSessionDto,
  ) {
    return this.chatService.getOrCreateSession(userId, dto.reportId);
  }

  @Get('sessions')
  @ApiOperation({ summary: '获取用户所有会话' })
  getSessions(@CurrentUser('id') userId: number) {
    return this.chatService.getSessions(userId);
  }

  @Get('session/:id/messages')
  @ApiOperation({ summary: '获取消息历史' })
  getMessages(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) sessionId: number,
    @Query() query: GetMessagesDto,
  ) {
    return this.chatService.getHistory(
      sessionId,
      userId,
      query.page,
      query.size,
      query.afterCreatedAt,
      query.afterId,
    );
  }

  @Get('session/:id/memories')
  @ApiOperation({ summary: '获取会话记忆' })
  getMemories(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) sessionId: number,
  ) {
    return this.chatService.getMemories(sessionId, userId);
  }

  @Delete('session/:id')
  @ApiOperation({ summary: '删除会话' })
  deleteSession(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) sessionId: number,
  ) {
    return this.chatService.deleteSession(sessionId, userId);
  }

  @Post('session/by-report/:reportUuid')
  @ApiOperation({ summary: '通过报告UUID创建/获取会话' })
  createSessionByReportUuid(
    @CurrentUser('id') userId: number,
    @Param('reportUuid') reportUuid: string,
  ) {
    return this.chatService.getSessionByReportUuid(reportUuid, userId);
  }

  @Post('message/:messageUuid/feedback')
  @ApiOperation({ summary: '提交消息反馈' })
  submitFeedback(
    @CurrentUser('id') userId: number,
    @Param('messageUuid') messageUuid: string,
    @Body() body: { score: number; text?: string },
  ) {
    return this.chatService.processFeedback(userId, messageUuid, body.score, body.text);
  }
}
