import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('CRM')
@Controller('crm')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrmController {
  constructor(private crmService: CrmService) {}

  @Post('customer')
  @ApiOperation({ summary: '创建客户' })
  createCustomer(@Body() data: any) {
    return this.crmService.createCustomer(data);
  }

  @Patch('customer/:id')
  @ApiOperation({ summary: '更新客户信息' })
  updateCustomer(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.crmService.updateCustomer(id, data);
  }

  @Get('customers')
  @ApiOperation({ summary: '客户列表' })
  listCustomers(
    @Query('stage') stage?: string,
    @Query('level') level?: string,
    @Query('page') page?: number,
  ) {
    return this.crmService.listCustomers({ stage, level, page });
  }

  @Post('follow-up')
  @ApiOperation({ summary: '添加跟进记录' })
  addFollowUp(
    @CurrentUser('id') operatorId: number,
    @Body() data: { customerId: number; followType: string; content: string; result?: string },
  ) {
    return this.crmService.addFollowUp({ ...data, operatorId });
  }

  @Get('customer/:id/timeline')
  @ApiOperation({ summary: '客户跟进时间线' })
  getTimeline(@Param('id', ParseIntPipe) id: number) {
    return this.crmService.getCustomerTimeline(id);
  }

  @Get('funnel')
  @ApiOperation({ summary: '转化漏斗数据' })
  getFunnel() {
    return this.crmService.getConversionFunnel();
  }
}
