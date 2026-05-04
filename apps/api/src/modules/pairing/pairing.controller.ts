import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PairingService } from './pairing.service';
import { PairingBillingService } from './pairing-billing.service';
import {
  SendPairingRequestDto,
  AcceptPairingRequestDto,
  ConfigurePairingDto,
  QueryPairingDto,
  PayPairingDto,
  InitiateSelfPairingDto,
  SelfPairingQueryDto,
  SelfPairingPaymentDto,
} from './pairing.dto';

@ApiTags('配对')
@Controller('pairing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PairingController {
  constructor(
    private pairingService: PairingService,
    private billingService: PairingBillingService,
  ) {}

  @Post('request')
  @ApiOperation({ summary: '发起配对请求' })
  sendRequest(
    @CurrentUser('id') userId: number,
    @Body() dto: SendPairingRequestDto,
  ) {
    return this.pairingService.sendRequest({
      initiatorId: userId,
      receiverId: dto.receiverId,
      pairingType: dto.pairingType,
      message: dto.message,
      chartId: dto.chartId,
    });
  }

  @Get('requests/incoming')
  @ApiOperation({ summary: '收到的配对请求列表' })
  getIncomingRequests(
    @CurrentUser('id') userId: number,
    @Query() query: QueryPairingDto,
  ) {
    return this.pairingService.getIncomingRequests(userId, query.page, query.size);
  }

  @Get('requests/outgoing')
  @ApiOperation({ summary: '发出的配对请求列表' })
  getOutgoingRequests(
    @CurrentUser('id') userId: number,
    @Query() query: QueryPairingDto,
  ) {
    return this.pairingService.getOutgoingRequests(userId, query.page, query.size);
  }

  @Get('report/:uuid')
  @ApiOperation({ summary: '获取配对报告详情' })
  getReport(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    return this.pairingService.getRequest(uuid, userId);
  }

  @Get('reports')
  @ApiOperation({ summary: '获取我的所有配对报告' })
  getPairingReports(
    @CurrentUser('id') userId: number,
    @Query() query: QueryPairingDto,
  ) {
    return this.pairingService.getPairingReports(userId, query.page, query.size);
  }

  @Get('request/:uuid')
  @ApiOperation({ summary: '获取配对请求详情' })
  getRequest(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    return this.pairingService.getRequest(uuid, userId);
  }

  @Put('request/:uuid/accept')
  @HttpCode(200)
  @ApiOperation({ summary: '同意配对请求' })
  acceptRequest(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
    @Body() dto: AcceptPairingRequestDto,
  ) {
    return this.pairingService.acceptRequest(uuid, userId, dto.chartId);
  }

  @Put('request/:uuid/reject')
  @HttpCode(200)
  @ApiOperation({ summary: '拒绝配对请求' })
  rejectRequest(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    return this.pairingService.rejectRequest(uuid, userId);
  }

  @Delete('request/:uuid')
  @HttpCode(200)
  @ApiOperation({ summary: '取消配对请求' })
  cancelRequest(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    return this.pairingService.cancelRequest(uuid, userId);
  }

  @Get('pricing')
  @ApiOperation({ summary: '获取所有配对类型价格与免费次数' })
  getPricing(@CurrentUser('id') userId: number) {
    return this.billingService.getPricingConfig();
  }

  @Get('request/:uuid/free-trial')
  @ApiOperation({ summary: '查询配对请求的免费试用状态' })
  async getFreeTrialStatus(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    const request = await this.pairingService.getRequest(uuid, userId);
    return this.billingService.checkFreeTrial(userId, request.pairingType);
  }

  @Post('request/:uuid/pay')
  @HttpCode(200)
  @ApiOperation({ summary: '为配对请求创建支付订单' })
  async payForRequest(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
    @Body() dto: PayPairingDto,
  ) {
    const request = await this.pairingService.getRequest(uuid, userId);
    const order = await this.billingService.createPairingOrder(
      userId, uuid, request.pairingType,
    );

    if (!order) {
      throw new BadRequestException('创建支付订单失败');
    }

    if (dto.method === 'balance') {
      return this.pairingService.payWithBalance(userId, order.id, uuid);
    }

    return { order, message: '请使用第三方支付完成付款' };
  }

  @Get('request/:uuid/pay/status')
  @ApiOperation({ summary: '查询配对请求支付状态' })
  async getPayStatus(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    const request = await this.pairingService.getRequest(uuid, userId);
    if (!request.orderId) {
      return { paid: false, message: '未创建支付订单' };
    }
    const order = await this.pairingService.getOrderStatus(request.orderId);
    return {
      paid: order.status >= 1,
      status: order.status,
      orderId: order.id,
    };
  }

  @Post('request/:uuid/generate')
  @HttpCode(200)
  @ApiOperation({ summary: '支付后触发配对报告生成' })
  generateReport(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
  ) {
    return this.pairingService.generateReport(uuid, userId);
  }

  @Post('request/:uuid/configure')
  @HttpCode(200)
  @ApiOperation({ summary: '配置命盘（发起方或接收方选择命盘）' })
  configurePairing(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
    @Body() dto: ConfigurePairingDto,
  ) {
    return this.pairingService.configurePairing(uuid, userId, dto.chartId);
  }

  // ============ 自选配对 ============

  @Post('self/initiate')
  @ApiOperation({ summary: '发起自选配对（选择两个已有命盘进行配对分析）' })
  initiateSelfPairing(
    @CurrentUser('id') userId: number,
    @Body() dto: InitiateSelfPairingDto,
  ) {
    return this.pairingService.initiateSelfPairing({
      userId,
      chartIdA: dto.chartIdA,
      chartIdB: dto.chartIdB,
      pairingType: dto.pairingType,
    });
  }

  @Get('self/requests')
  @ApiOperation({ summary: '获取自选配对请求列表' })
  getSelfPairingRequests(
    @CurrentUser('id') userId: number,
    @Query() query: SelfPairingQueryDto,
  ) {
    return this.pairingService.getSelfPairingRequests(userId, query.page, query.size);
  }

  @Post('self/:uuid/pay-and-generate')
  @HttpCode(200)
  @ApiOperation({ summary: '自选配对：支付并生成报告（一步完成）' })
  async selfPayAndGenerate(
    @CurrentUser('id') userId: number,
    @Param('uuid') uuid: string,
    @Body() dto: SelfPairingPaymentDto,
  ) {
    // Try generateReport first — it handles free-trial consumption internally
    try {
      return await this.pairingService.generateReport(uuid, userId);
    } catch (err: any) {
      const msg = err?.message || '';
      // If free trial exhausted, fall through to payment path
      if (!msg.includes('免费次数已用完') && !msg.includes('请先完成支付')) {
        throw err;
      }
    }

    // Payment path: create order and pay
    const request = await this.pairingService.getRequest(uuid, userId);
    const order = await this.billingService.createPairingOrder(
      userId, uuid, request.pairingType,
    );
    if (!order) {
      throw new BadRequestException('创建支付订单失败');
    }

    if (dto.method === 'balance') {
      await this.pairingService.payWithBalance(userId, order.id, uuid);
      return this.pairingService.generateReport(uuid, userId);
    }

    return { order, message: '请使用第三方支付完成付款' };
  }
}
