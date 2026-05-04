import { IsInt, IsOptional, IsString, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChartDto {
  @ApiProperty({ example: 1990, description: '年（公历或农历，取决于 calendar_type）' })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 6, description: '月（公历或农历）' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 15, description: '日（公历或农历）' })
  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @ApiProperty({ required: false, default: 'solar', description: '日历类型: solar(公历) / lunar(农历)', enum: ['solar', 'lunar'] })
  @IsOptional()
  @IsString()
  @IsIn(['solar', 'lunar'])
  calendar_type?: 'solar' | 'lunar';

  @ApiProperty({ required: false, default: false, description: '农历输入时是否为闰月' })
  @IsOptional()
  @IsBoolean()
  is_leap_month?: boolean;

  @ApiProperty({ example: 14, description: '小时(0-23)' })
  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @ApiProperty({ example: 30, description: '分钟' })
  @IsInt()
  @Min(0)
  @Max(59)
  minute: number;

  @ApiProperty({ example: 1, description: '性别: 1男 2女' })
  @IsInt()
  gender: number;

  @ApiProperty({ required: false, example: '北京' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ required: false, example: 'self' })
  @IsOptional()
  @IsString()
  relation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, example: 'early', description: '子时规则: early/late' })
  @IsOptional()
  @IsString()
  midnight_rule?: string;

  @ApiProperty({ required: false, example: '8', description: '时区偏移(小时)' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
