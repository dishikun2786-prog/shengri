import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('订单')
@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建订单' })
  createOrder(
    @CurrentUser('id') userId: number,
    @Body() body: { productId: number; chartId?: number; reportId?: number; sourceChannel?: string },
  ) {
    return this.orderService.createOrder({ userId, ...body });
  }

  @Get('products')
  @ApiOperation({ summary: '获取产品列表' })
  listProducts(@Query('category') category?: string) {
    return this.orderService.listProducts(category);
  }

  @Post('pay-balance/:orderNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '余额支付订单' })
  payWithBalance(
    @CurrentUser('id') userId: number,
    @Param('orderNo') orderNo: string,
  ) {
    return this.orderService.payWithBalance(userId, orderNo);
  }

  @Get(':orderNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询订单详情' })
  getOrder(@Param('orderNo') orderNo: string) {
    return this.orderService.getOrderByNo(orderNo);
  }
}
