import { IsString, IsOptional, IsInt, IsIn, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const PAIRING_TYPES = ['personality', 'career', 'wealth', 'hehun', 'comprehensive'] as const;
export type PairingType = typeof PAIRING_TYPES[number];

export const PAIRING_TYPE_LABELS: Record<string, string> = {
  personality: '性格匹配',
  career: '事业合作',
  wealth: '财运互补',
  hehun: '合婚分析',
  comprehensive: '综合配对',
};

export const PAIRING_STATUS_LABELS: Record<number, string> = {
  0: '等待同意',
  1: '已同意',
  2: '已拒绝',
  3: '配置中',
  4: '分析中',
  5: '已完成',
  6: '已取消',
};

export class SendPairingRequestDto {
  @ApiProperty({ description: '接收方用户ID' })
  @Type(() => Number)
  @IsInt()
  receiverId: number;

  @ApiProperty({ description: '配对类型', enum: PAIRING_TYPES })
  @IsString()
  @IsIn(PAIRING_TYPES)
  pairingType: string;

  @ApiPropertyOptional({ description: '发起方命盘ID（可选预选）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chartId?: number;

  @ApiPropertyOptional({ description: '留言', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}

export class AcceptPairingRequestDto {
  @ApiPropertyOptional({ description: '接收方命盘ID（可选预选）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chartId?: number;
}

export class ConfigurePairingDto {
  @ApiProperty({ description: '命盘ID' })
  @Type(() => Number)
  @IsInt()
  chartId: number;
}

export class QueryPairingDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  size?: number = 20;
}

export class PayPairingDto {
  @ApiPropertyOptional({ description: '支付方式', enum: ['balance', 'wechat', 'alipay'], default: 'balance' })
  @IsOptional()
  @IsString()
  @IsIn(['balance', 'wechat', 'alipay'])
  method?: string = 'balance';
}

export class InitiateSelfPairingDto {
  @ApiProperty({ description: '命盘A的ID' })
  @Type(() => Number)
  @IsInt()
  chartIdA: number;

  @ApiProperty({ description: '命盘B的ID' })
  @Type(() => Number)
  @IsInt()
  chartIdB: number;

  @ApiProperty({ description: '配对类型', enum: PAIRING_TYPES })
  @IsString()
  @IsIn(PAIRING_TYPES)
  pairingType: string;
}

export class SelfPairingQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  size?: number = 20;
}

export class SelfPairingPaymentDto {
  @ApiPropertyOptional({ description: '支付方式', enum: ['balance', 'wechat', 'alipay'], default: 'balance' })
  @IsOptional()
  @IsString()
  @IsIn(['balance', 'wechat', 'alipay'])
  method?: string = 'balance';
}
