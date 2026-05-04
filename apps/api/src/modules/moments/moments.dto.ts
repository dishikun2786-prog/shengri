import { IsString, IsOptional, IsArray, MaxLength, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMomentDto {
  @ApiProperty({ description: '动态内容', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: '图片 URL 列表，最多9张', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class QueryMomentDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 20;

  @ApiPropertyOptional({ description: '用户ID筛选' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

export class CreateCommentDto {
  @ApiProperty({ description: '评论内容', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  content: string;

  @ApiPropertyOptional({ description: '回复的评论ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  replyToId?: number;
}

export class QueryCommentDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 20;
}
