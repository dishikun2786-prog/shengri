import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { RegisterDto, LoginRequestDto } from './auth.dto';

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
}
