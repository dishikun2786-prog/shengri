import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MomentsService } from './moments.service';
import {
  CreateMomentDto,
  QueryMomentDto,
  CreateCommentDto,
  QueryCommentDto,
} from './moments.dto';

@ApiTags('朋友圈')
@Controller('moments')
export class MomentsController {
  constructor(private momentsService: MomentsService) {}

  @Get()
  @ApiOperation({ summary: '获取朋友圈动态列表' })
  getMoments(
    @Query() query: QueryMomentDto,
    @CurrentUser('id') userId?: number,
  ) {
    return this.momentsService.getMoments(query.page, query.size, userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的朋友圈动态' })
  getMyMoments(
    @CurrentUser('id') userId: number,
    @Query() query: QueryMomentDto,
  ) {
    return this.momentsService.getMyMoments(userId, query.page, query.size);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取动态详情' })
  getMomentById(
    @Param('id', ParseIntPipe) momentId: number,
    @CurrentUser('id') userId?: number,
  ) {
    return this.momentsService.getMomentById(momentId, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布朋友圈动态' })
  createMoment(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateMomentDto,
  ) {
    return this.momentsService.createMoment(userId, dto.content, dto.images);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除朋友圈动态' })
  deleteMoment(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) momentId: number,
  ) {
    return this.momentsService.deleteMoment(momentId, userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: '点赞' })
  likeMoment(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) momentId: number,
  ) {
    return this.momentsService.likeMoment(momentId, userId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: '取消点赞' })
  unlikeMoment(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) momentId: number,
  ) {
    return this.momentsService.unlikeMoment(momentId, userId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '获取评论列表' })
  getComments(
    @Param('id', ParseIntPipe) momentId: number,
    @Query() query: QueryCommentDto,
  ) {
    return this.momentsService.getComments(momentId, query.page, query.size);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加评论' })
  addComment(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) momentId: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.momentsService.addComment(momentId, userId, dto.content, dto.replyToId);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除评论' })
  deleteComment(
    @CurrentUser('id') userId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.momentsService.deleteComment(commentId, userId);
  }

  @Get(':id/likes')
  @ApiOperation({ summary: '获取点赞用户列表' })
  getLikes(
    @Param('id', ParseIntPipe) momentId: number,
    @Query() query: QueryCommentDto,
  ) {
    return this.momentsService.getLikes(momentId, query.page, query.size);
  }
}
