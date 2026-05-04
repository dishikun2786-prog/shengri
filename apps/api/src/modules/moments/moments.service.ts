import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MomentsService {
  private readonly logger = new Logger(MomentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取朋友圈动态列表（公开）
   */
  async getMoments(page = 1, size = 20, userId?: number) {
    const skip = (page - 1) * size;

    const [moments, total] = await Promise.all([
      this.prisma.moment.findMany({
        where: { status: 1, isPublic: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              username: true,
              avatarUrl: true,
              bio: true,
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, url: true, width: true, height: true },
          },
          likes: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.moment.count({ where: { status: 1, isPublic: true } }),
    ]);

    return {
      moments: moments.map((m) => ({
        id: m.id,
        uuid: m.uuid,
        content: m.content,
        createdAt: m.createdAt,
        user: m.user,
        images: m.images,
        isLiked: userId ? m.likes?.length > 0 : false,
        likesCount: m._count.likes,
        commentsCount: m._count.comments,
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  /**
   * 获取当前用户的朋友圈列表
   */
  async getMyMoments(userId: number, page = 1, size = 20) {
    const skip = (page - 1) * size;

    const [moments, total] = await Promise.all([
      this.prisma.moment.findMany({
        where: { userId, status: 1 },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              username: true,
              avatarUrl: true,
              bio: true,
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, url: true, width: true, height: true },
          },
          likes: {
            where: { userId },
            select: { id: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.moment.count({ where: { userId, status: 1 } }),
    ]);

    return {
      moments: moments.map((m) => ({
        id: m.id,
        uuid: m.uuid,
        content: m.content,
        createdAt: m.createdAt,
        user: m.user,
        images: m.images,
        isLiked: m.likes?.length > 0,
        likesCount: m._count.likes,
        commentsCount: m._count.comments,
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  /**
   * 发布朋友圈动态
   */
  async createMoment(userId: number, content: string, imageUrls?: string[]) {
    if (!content.trim() && (!imageUrls || imageUrls.length === 0)) {
      throw new BadRequestException('内容和图片至少需要填写一项');
    }

    if (imageUrls && imageUrls.length > 9) {
      throw new BadRequestException('最多上传9张图片');
    }

    const moment = await this.prisma.moment.create({
      data: {
        userId,
        content: content.trim(),
        images: imageUrls
          ? {
              create: imageUrls.map((url, index) => ({
                url,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, width: true, height: true },
        },
      },
    });

    return {
      id: moment.id,
      uuid: moment.uuid,
      content: moment.content,
      createdAt: moment.createdAt,
      user: moment.user,
      images: moment.images,
      isLiked: false,
      likesCount: 0,
      commentsCount: 0,
    };
  }

  /**
   * 删除朋友圈动态（仅作者）
   */
  async deleteMoment(momentId: number, userId: number) {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      select: { userId: true, status: true },
    });

    if (!moment || moment.status === 0) {
      throw new NotFoundException('动态不存在或已删除');
    }

    if (moment.userId !== userId) {
      throw new ForbiddenException('无权删除此动态');
    }

    await this.prisma.moment.update({
      where: { id: momentId },
      data: { status: 0 },
    });

    return { success: true };
  }

  /**
   * 点赞
   */
  async likeMoment(momentId: number, userId: number) {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      select: { id: true, status: true },
    });

    if (!moment || moment.status === 0) {
      throw new NotFoundException('动态不存在');
    }

    const existing = await this.prisma.momentLike.findUnique({
      where: { momentId_userId: { momentId, userId } },
    });

    if (existing) {
      return { success: true, liked: true };
    }

    await this.prisma.$transaction([
      this.prisma.momentLike.create({
        data: { momentId, userId },
      }),
      this.prisma.moment.update({
        where: { id: momentId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return { success: true, liked: true };
  }

  /**
   * 取消点赞
   */
  async unlikeMoment(momentId: number, userId: number) {
    const existing = await this.prisma.momentLike.findUnique({
      where: { momentId_userId: { momentId, userId } },
    });

    if (!existing) {
      return { success: true, liked: false };
    }

    await this.prisma.$transaction([
      this.prisma.momentLike.delete({
        where: { momentId_userId: { momentId, userId } },
      }),
      this.prisma.moment.update({
        where: { id: momentId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, liked: false };
  }

  /**
   * 获取动态详情
   */
  async getMomentById(momentId: number, userId?: number) {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, width: true, height: true },
        },
        likes: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!moment || moment.status === 0) {
      throw new NotFoundException('动态不存在');
    }

    return {
      id: moment.id,
      uuid: moment.uuid,
      content: moment.content,
      createdAt: moment.createdAt,
      user: moment.user,
      images: moment.images,
      isLiked: userId ? (moment.likes as any[])?.length > 0 : false,
      likesCount: moment._count.likes,
      commentsCount: moment._count.comments,
    };
  }

  /**
   * 获取评论列表
   */
  async getComments(momentId: number, page = 1, size = 20) {
    const skip = (page - 1) * size;

    const [comments, total] = await Promise.all([
      this.prisma.momentComment.findMany({
        where: { momentId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: size,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              username: true,
              avatarUrl: true,
            },
          },
          replyTo: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  username: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.momentComment.count({ where: { momentId } }),
    ]);

    return {
      comments,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  /**
   * 添加评论
   */
  async addComment(momentId: number, userId: number, content: string, replyToId?: number) {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      select: { id: true, status: true },
    });

    if (!moment || moment.status === 0) {
      throw new NotFoundException('动态不存在');
    }

    if (replyToId) {
      const replyTo = await this.prisma.momentComment.findUnique({
        where: { id: replyToId, momentId },
      });
      if (!replyTo) {
        throw new NotFoundException('回复的评论不存在');
      }
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.momentComment.create({
        data: {
          momentId,
          userId,
          content: content.trim(),
          replyToId: replyToId || null,
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              username: true,
              avatarUrl: true,
            },
          },
          replyTo: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      await tx.moment.update({
        where: { id: momentId },
        data: { commentsCount: { increment: 1 } },
      });

      return created;
    });

    return comment;
  }

  /**
   * 删除评论
   */
  async deleteComment(commentId: number, userId: number) {
    const comment = await this.prisma.momentComment.findUnique({
      where: { id: commentId },
      select: { userId: true, momentId: true },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('无权删除此评论');
    }

    await this.prisma.$transaction([
      this.prisma.momentComment.delete({
        where: { id: commentId },
      }),
      this.prisma.moment.update({
        where: { id: comment.momentId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  }

  /**
   * 获取点赞用户列表
   */
  async getLikes(momentId: number, page = 1, size = 20) {
    const skip = (page - 1) * size;

    const [likes, total] = await Promise.all([
      this.prisma.momentLike.findMany({
        where: { momentId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.momentLike.count({ where: { momentId } }),
    ]);

    return {
      likes: likes.map((l) => ({ ...l, user: l.user })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }
}
