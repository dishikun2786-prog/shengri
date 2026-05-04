import {
  Controller, Post, Get, Body, Param, Query, Req, Res,
  UseGuards, Headers, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfigService } from '../config/config.service';

@ApiTags('支付')
@Controller('payment')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private configService: ConfigService,
  ) {}

  @Post('wechat/notify')
  @ApiOperation({ summary: '微信支付异步回调' })
  async wechatNotify(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(req.body);
    return this.paymentService.handleWechatNotify(headers, rawBody);
  }

  @Post('alipay/notify')
  @ApiOperation({ summary: '支付宝异步回调' })
  async alipayNotify(@Body() body: Record<string, string>) {
    return this.paymentService.handleAlipayNotify(body);
  }

  @Get('alipay/return')
  @ApiOperation({ summary: '支付宝同步跳转' })
  async alipayReturn(@Query() query: Record<string, string>, @Res() res: Response) {
    const orderNo = query.out_trade_no;
    const creds = await this.configService.getPaymentCredentials();
    const baseReturnUrl = creds.alipay.returnUrl || '/payment/result';
    res.redirect(`${baseReturnUrl}?orderNo=${orderNo}`);
  }

  @Get('status/:orderNo')
  @ApiOperation({ summary: '查询支付状态（公开，仅返回基本状态）' })
  queryStatus(@Param('orderNo') orderNo: string) {
    return this.paymentService.queryPaymentStatus(orderNo);
  }

  @Post('wechat/:orderNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发起微信支付' })
  createWechatPay(
    @Param('orderNo') orderNo: string,
    @Query('type') type: string = 'native',
  ) {
    return this.paymentService.createWechatPay(orderNo, type);
  }

  @Post('alipay/:orderNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发起支付宝支付' })
  createAlipayPay(
    @Param('orderNo') orderNo: string,
    @Query('type') type: string = 'page',
  ) {
    return this.paymentService.createAlipayPay(orderNo, type);
  }
}
