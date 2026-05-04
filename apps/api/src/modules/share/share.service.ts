import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create or return an existing active share for a report (accepts UUID or numeric ID)
   */
  async createShare(userId: number, reportUuid: string) {
    const report = await this.prisma.analysisReport.findFirst({
      where: {
        uuid: reportUuid,
        status: 1,
      },
      select: { id: true, userId: true, reportType: true, shareCount: true },
    });

    if (!report) throw new NotFoundException('报告不存在');
    if (report.userId !== userId) throw new ForbiddenException('无权限分享该报告');

    // Idempotent: return existing active share if one exists
    const existing = await this.prisma.reportShare.findFirst({
      where: { reportId: report.id, userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return this.formatShareResponse(existing);
    }

    // Create new share
    const share = await this.prisma.reportShare.create({
      data: { reportId: report.id, userId },
    });

    // Increment shareCount on the report
    await this.prisma.analysisReport.update({
      where: { id: report.id },
      data: { shareCount: { increment: 1 } },
    });

    this.logger.log(`用户 ${userId} 分享了报告 ${report.id}，shareToken=${share.shareToken}`);
    return this.formatShareResponse(share);
  }

  /**
   * Get shared report preview data (public, no auth required)
   */
  async getSharedReport(token: string) {
    const share = await this.prisma.reportShare.findFirst({
      where: { shareToken: token, isActive: true },
      include: {
        report: {
          select: {
            id: true,
            uuid: true,
            reportType: true,
            aiContent: true,
            aiSummary: true,
            ruleTags: true,
            isPaid: true,
            viewCount: true,
            shareCount: true,
            createdAt: true,
          },
        },
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!share) throw new NotFoundException('分享链接不存在或已失效');

    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new NotFoundException('分享链接已过期');
    }

    // Increment view counts
    await Promise.all([
      this.prisma.reportShare.update({
        where: { id: share.id },
        data: { viewCount: { increment: 1 } },
      }),
      this.prisma.analysisReport.update({
        where: { id: share.reportId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);

    // Truncate report content to first 2 sections for preview
    const previewContent = this.truncateForPreview(share.report.aiContent);

    return {
      sharer: {
        nickname: share.user.nickname || '用户',
        avatarUrl: share.user.avatarUrl || null,
      },
      report: {
        uuid: share.report.uuid,
        reportType: share.report.reportType,
        aiContent: previewContent,
        aiSummary: share.report.aiSummary,
        ruleTags: share.report.ruleTags,
        isPaid: share.report.isPaid,
        createdAt: share.report.createdAt,
      },
      stats: {
        viewCount: share.viewCount + 1, // Include current view
        shareCount: share.report.shareCount,
      },
    };
  }

  /**
   * Deactivate a share
   */
  async deactivateShare(userId: number, shareId: number) {
    const share = await this.prisma.reportShare.findUnique({
      where: { id: shareId },
    });

    if (!share) throw new NotFoundException('分享记录不存在');
    if (share.userId !== userId) throw new ForbiddenException('无权限操作该分享');

    await this.prisma.reportShare.update({
      where: { id: shareId },
      data: { isActive: false },
    });

    return { success: true };
  }

  /**
   * List all shares for a user
   */
  async listUserShares(userId: number) {
    const shares = await this.prisma.reportShare.findMany({
      where: { userId, isActive: true },
      include: {
        report: {
          select: {
            uuid: true,
            reportType: true,
            aiSummary: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((s) => this.formatShareResponse(s));
  }

  /**
   * Truncate report content to first 2 sections for preview
   */
  private truncateForPreview(content: string | null): string | null {
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      if (parsed.sections && Array.isArray(parsed.sections)) {
        return JSON.stringify({
          ...parsed,
          sections: parsed.sections.slice(0, 2),
          _preview: true,
        });
      }
      return content;
    } catch {
      // Plain text: return first ~30% of lines
      const lines = content.split('\n');
      const previewLines = Math.max(Math.floor(lines.length * 0.3), 10);
      return lines.slice(0, previewLines).join('\n') + '\n\n...';
    }
  }

  private formatShareResponse(share: any) {
    const baseUrl = process.env.WEB_BASE_URL || 'https://sr.openedskill.com';
    return {
      id: share.id,
      shareToken: share.shareToken,
      shareUrl: `${baseUrl}/share/${share.shareToken}?ref=${share.userId || share.user?.id || ''}`,
      viewCount: share.viewCount || 0,
      shareCount: share.shareCount || 0,
      isActive: share.isActive,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
      report: share.report
        ? {
            uuid: share.report.uuid,
            reportType: share.report.reportType,
            aiSummary: share.report.aiSummary,
          }
        : undefined,
    };
  }
}
