import { IsString, IsOptional, MinLength, MaxLength, Matches, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export class RegisterDto {
  @ApiProperty({ example: 'zhangsan' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(USERNAME_RE, { message: '用户名仅支持 3–20 位字母、数字或下划线' })
  username: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'uuid' })
  @IsString()
  captchaId: string;

  @ApiProperty({ example: 'abcd' })
  @IsString()
  captcha: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string;

  @ApiPropertyOptional({ example: 42, description: '推荐人用户ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  referrerId?: number;
}

/** 与 account 二选一；新客户端只传 account */
export class LoginRequestDto {
  @ApiPropertyOptional({ example: 'zhangsan', description: '账号（与 phone 二选一）' })
  @IsOptional()
  @IsString()
  account?: string;

  @ApiPropertyOptional({ example: '13800138000', description: '历史字段，兼容管理端旧版' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;
}
