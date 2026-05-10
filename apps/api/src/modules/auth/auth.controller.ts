import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { RegisterDto, LoginRequestDto, SendSmsCodeDto, SmsLoginDto, BindPhoneDto } from './auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private captchaService: CaptchaService,
  ) {}

  @Get('captcha')
  @ApiOperation({ summary: '获取图形验证码' })
  captcha() {
    return this.captchaService.create();
  }

  @Post('register')
  @ApiOperation({ summary: '用户名 + 密码 + 图形验证码注册' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '账号 + 密码登录（账号可为用户名/手机号/邮箱）' })
  login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
  }

  // ========== SMS Auth ==========

  @Post('sms/check')
  @ApiOperation({ summary: '检查手机号是否已注册' })
  checkPhone(@Body() dto: SendSmsCodeDto) {
    return this.authService.checkPhoneExists(dto.phone);
  }

  @Post('sms/send')
  @ApiOperation({ summary: '发送短信验证码' })
  sendSmsCode(@Body() dto: SendSmsCodeDto) {
    return this.authService.sendSmsCode(dto.phone);
  }

  @Post('sms/login')
  @ApiOperation({ summary: '短信验证码登录（手机号不存在则自动注册）' })
  smsLogin(@Body() dto: SmsLoginDto) {
    return this.authService.smsLogin(dto.phone, dto.code, dto.username, dto.password, dto.nickname);
  }

  @Post('bind-phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '绑定手机号（需已登录）' })
  bindPhone(
    @CurrentUser('id') userId: number,
    @Body() dto: BindPhoneDto,
  ) {
    return this.authService.bindPhone(userId, dto.phone, dto.code);
  }
}
