import { IsInt, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSessionDto {
  @ApiProperty({ description: '报告ID' })
  @IsInt()
  reportId: number;
}

export class SendMessageDto {
  @ApiProperty({ description: '会话ID' })
  @IsInt()
  sessionId: number;

  @ApiProperty({ description: '消息内容' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class GetMessagesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  size?: number = 20;

  @ApiPropertyOptional({ description: '游标时间（ISO字符串）' })
  @IsOptional()
  @IsString()
  afterCreatedAt?: string;

  @ApiPropertyOptional({ description: '游标消息ID（同毫秒排序）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  afterId?: number;
}
