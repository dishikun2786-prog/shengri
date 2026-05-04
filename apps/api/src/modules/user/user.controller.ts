import { Controller, Get, Patch, Body, UseGuards, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('用户')
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  getProfile(@CurrentUser('id') userId: number) {
    return this.userService.findById(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户信息' })
  updateProfile(@CurrentUser('id') userId: number, @Body() data: any) {
    return this.userService.updateProfile(userId, data);
  }

  @Get('charts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户命盘列表' })
  getCharts(@CurrentUser('id') userId: number) {
    return this.userService.getUserCharts(userId);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户订单列表' })
  getOrders(@CurrentUser('id') userId: number) {
    return this.userService.getUserOrders(userId);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户报告列表' })
  getReports(@CurrentUser('id') userId: number) {
    return this.userService.getUserReports(userId);
  }

  @Delete('charts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除用户命盘' })
  deleteChart(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) chartId: number,
  ) {
    return this.userService.deleteUserChart(userId, chartId);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  changePassword(
    @CurrentUser('id') userId: number,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(userId, body.oldPassword, body.newPassword);
  }

  @Delete('reports/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除用户报告' })
  deleteReport(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) reportId: number,
  ) {
    return this.userService.deleteUserReport(userId, reportId);
  }
}
