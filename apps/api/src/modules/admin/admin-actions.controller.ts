import { Controller, Post, Get, Param, Body, UseGuards, ParseIntPipe, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DistributionService } from '../distribution/distribution.service';
import { MasterService } from '../master/master.service';
import { CardKeyService } from '../card-key/card-key.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Admin操作')
@Controller('admin/actions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminActionsController {
  constructor(
    private distributionService: DistributionService,
    private masterService: MasterService,
    private cardKeyService: CardKeyService,
    private prisma: PrismaService,
  ) {}

  @Post('commission/process/:orderId')
  @ApiOperation({ summary: '手动触发订单佣金计算' })
  processCommission(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.distributionService.processCommission(orderId);
  }

  @Post('consultation/complete/:consultationNo')
  @ApiOperation({ summary: '管理员完结咨询单' })
  completeConsultation(
    @Param('consultationNo') consultationNo: string,
    @Body() body: { masterId: number; messages?: any },
  ) {
    return this.masterService.completeConsultation(consultationNo, body.masterId, {
      messages: body.messages || [],
    });
  }

  @Post('card-key/generate')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '批量生成卡密（代理生成时从余额扣款）' })
  async generateCardKeys(
    @Body() body: { amount: number; count: number; remark?: string; expireAt?: string },
    @CurrentUser() currentUser: any,
  ) {
    const isAgent = currentUser?.role === 'agent';
    if (isAgent) {
      const totalCost = body.amount * body.count;
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: currentUser.id } });
      const balance = Number(user.balance || 0);
      if (balance < totalCost) {
        throw new BadRequestException(
          `余额不足：当前余额 ¥${balance.toFixed(2)}，需 ¥${totalCost.toFixed(2)}。请联系管理员充值。`,
        );
      }
    }

    const result = await this.cardKeyService.generateBatch({
      ...body,
      creatorId: isAgent ? currentUser.id : undefined,
      deductBalance: isAgent,
    });

    return result;
  }

  @Post('card-key/void/:id')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '作废卡密' })
  async voidCardKey(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    const isAgent = currentUser?.role === 'agent';
    if (isAgent) {
      const cardKey = await this.prisma.cardKey.findUniqueOrThrow({ where: { id } });
      if (cardKey.creatorId !== currentUser.id) {
        throw new BadRequestException('只能作废自己生成的卡密');
      }
      if (cardKey.status !== 0) {
        throw new BadRequestException('只能作废未使用的卡密');
      }
      // Refund the card amount to agent's balance for voided cards
      const refundAmount = Number(cardKey.amount);
      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: currentUser.id },
          data: { balance: { increment: refundAmount } },
        });
        await tx.balanceTransaction.create({
          data: {
            userId: currentUser.id,
            type: 'agent_card_void',
            amount: refundAmount,
            balanceAfter: user.balance,
            refId: String(cardKey.id),
            refType: 'card_key',
            remark: `作废卡密退款: ${cardKey.code}`,
          },
        });
        await tx.cardKey.update({ where: { id }, data: { status: 2 } });
      });
      return { success: true, refundAmount };
    }
    return this.cardKeyService.voidCardKey(id);
  }

  @Post('agent/recharge')
  @Roles('admin')
  @ApiOperation({ summary: '管理员给代理充值余额' })
  async rechargeAgent(
    @Body() body: { userId: number; amount: number; remark?: string },
    @CurrentUser('id') adminId: number,
  ) {
    if (!body.userId || !body.amount || body.amount <= 0) {
      throw new BadRequestException('参数错误：userId和amount必填，amount必须>0');
    }

    const targetUser = await this.prisma.user.findUniqueOrThrow({ where: { id: body.userId } });
    if (targetUser.role !== 'agent') {
      throw new BadRequestException('只能给代理角色充值');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: body.userId },
        data: { balance: { increment: body.amount } },
      });

      const txRecord = await tx.balanceTransaction.create({
        data: {
          userId: body.userId,
          type: 'agent_recharge',
          amount: body.amount,
          balanceAfter: user.balance,
          refId: String(adminId),
          refType: 'admin',
          remark: body.remark || `管理员充值 ¥${body.amount}`,
        },
      });

      return { balance: user.balance, transactionId: txRecord.id };
    });

    return {
      success: true,
      userId: body.userId,
      amount: body.amount,
      balanceAfter: result.balance,
      transactionId: result.transactionId,
    };
  }

  @Get('agent/referral-link')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '获取代理推广链接' })
  getAgentReferralLink(@CurrentUser('id') userId: number) {
    const baseUrl = process.env.WEB_BASE_URL || 'https://sr.openedskill.com';
    return { referralLink: `${baseUrl}/?ref=${userId}` };
  }

  @Get('agent/dashboard')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '代理数据概览（含子代理统计）' })
  async getAgentDashboard(@CurrentUser('id') userId: number) {
    const [balance, cardStats, redeemedCount, unusedCount, todayGenerated, subAgentStats] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } }),
        this.prisma.cardKey.aggregate({
          where: { creatorId: userId },
          _count: { id: true },
          _sum: { amount: true },
        }),
        this.prisma.cardKey.count({ where: { creatorId: userId, status: 1 } }),
        this.prisma.cardKey.count({ where: { creatorId: userId, status: 0 } }),
        (async () => {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          return this.prisma.cardKey.count({
            where: { creatorId: userId, createdAt: { gte: todayStart } },
          });
        })(),
        // Sub-agent stats
        (async () => {
          const subAgents = await this.prisma.user.findMany({
            where: { referrerId: userId, role: 'agent' },
            select: { id: true, balance: true },
          });
          const totalBalance = subAgents.reduce(
            (sum, a) => sum + Number(a.balance),
            0,
          );
          return {
            count: subAgents.length,
            totalBalance,
          };
        })(),
      ]);

    return {
      balance: Number(balance.balance),
      totalGenerated: cardStats._count.id,
      totalFaceValue: Number(cardStats._sum.amount || 0),
      redeemedCount,
      unusedCount,
      todayGenerated,
      subAgentCount: subAgentStats.count,
      subAgentTotalBalance: subAgentStats.totalBalance,
    };
  }

  @Get('agent/referrals')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '获取代理的推广用户列表（含余额和消费统计）' })
  async getAgentReferrals(
    @CurrentUser() currentUser: any,
    @Query('page') page?: number,
    @Query('size') size?: number,
  ) {
    const userId = currentUser.id;
    const pageNum = page ? Number(page) : 1;
    const pageSize = size ? Number(size) : 20;
    const skip = (pageNum - 1) * pageSize;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { referrerId: userId },
        select: {
          id: true,
          nickname: true,
          phone: true,
          role: true,
          balance: true,
          createdAt: true,
          _count: { select: { createdCardKeys: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.user.count({ where: { referrerId: userId } }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        phone: u.phone,
        role: u.role,
        balance: Number(u.balance),
        cardKeyCount: u._count.createdCardKeys,
        createdAt: u.createdAt,
      })),
      total,
      page: pageNum,
      pageSize,
    };
  }

  @Post('agent/promote/:userId')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '将推广用户升级为代理' })
  async promoteToAgent(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: any,
  ) {
    const targetUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, nickname: true, role: true, referrerId: true },
    });

    // Agent can only promote their own referrals; admin can promote any
    if (currentUser.role === 'agent' && targetUser.referrerId !== currentUser.id) {
      throw new BadRequestException('只能升级自己的推广用户');
    }

    if (targetUser.role === 'agent') {
      throw new BadRequestException('该用户已是代理');
    }
    if (targetUser.role === 'admin') {
      throw new BadRequestException('不能升级管理员');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'agent' },
    });

    return { success: true, userId, nickname: targetUser.nickname };
  }

  @Get('agent/sub-agents')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '获取子代理列表（含余额和制卡统计）' })
  async getSubAgents(@CurrentUser() currentUser: any) {
    const userId = currentUser.id;

    const subAgents = await this.prisma.user.findMany({
      where: {
        role: 'agent',
        ...(currentUser.role === 'agent' ? { referrerId: userId } : {}),
      },
      select: {
        id: true,
        nickname: true,
        phone: true,
        balance: true,
        createdAt: true,
        _count: { select: { createdCardKeys: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get card key stats for each sub-agent
    const enriched = await Promise.all(
      subAgents.map(async (agent) => {
        const [redeemedCount, totalGenerated] = await Promise.all([
          this.prisma.cardKey.count({ where: { creatorId: agent.id, status: 1 } }),
          this.prisma.cardKey.aggregate({
            where: { creatorId: agent.id },
            _sum: { amount: true },
          }),
        ]);
        return {
          id: agent.id,
          nickname: agent.nickname,
          phone: agent.phone,
          balance: Number(agent.balance),
          cardKeyCount: (agent as any)._count?.createdCardKeys ?? 0,
          redeemedCount,
          totalFaceValue: Number(totalGenerated._sum.amount || 0),
          createdAt: agent.createdAt,
        };
      }),
    );

    return enriched;
  }

  @Get('agent/sub-agent/:id/transactions')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: '查看子代理余额流水' })
  async getSubAgentTransactions(
    @CurrentUser() currentUser: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('size') size?: number,
  ) {
    // Verify parent-child relationship
    const targetUser = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, referrerId: true, role: true },
    });

    if (currentUser.role === 'agent') {
      if (targetUser.referrerId !== currentUser.id) {
        throw new BadRequestException('只能查看自己代理的余额流水');
      }
    }

    const pageNum = page ? Number(page) : 1;
    const pageSize = size ? Number(size) : 20;
    const skip = (pageNum - 1) * pageSize;

    const [transactions, total] = await Promise.all([
      this.prisma.balanceTransaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.balanceTransaction.count({ where: { userId: id } }),
    ]);

    return { data: transactions, total, page: pageNum, pageSize };
  }

  @Get('withdrawal-requests')
  @ApiOperation({ summary: '提现审核列表' })
  getWithdrawalRequests(
    @Query('page') page?: number,
    @Query('size') size?: number,
    @Query('status') status?: number,
  ) {
    return this.distributionService.getPendingWithdrawals(
      page ? Number(page) : 1,
      size ? Number(size) : 20,
      status !== undefined ? Number(status) : undefined,
    );
  }

  @Post('withdrawal-requests/:id/approve')
  @ApiOperation({ summary: '通过提现申请' })
  approveWithdrawal(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.distributionService.approveWithdrawal(id, adminId);
  }

  @Post('withdrawal-requests/:id/deny')
  @ApiOperation({ summary: '拒绝提现申请' })
  denyWithdrawal(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
    @CurrentUser('id') adminId: number,
  ) {
    return this.distributionService.denyWithdrawal(id, adminId, body.reason);
  }
}
