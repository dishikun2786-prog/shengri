import { IsString, IsOptional, IsBoolean, IsNumber, Matches } from 'class-validator';

export class CalculateDto {
  @IsString()
  @Matches(/^1\d{10}$/, { message: '请输入有效的11位中国大陆手机号' })
  phone: string;

  @IsOptional()
  @IsString()
  question?: string;
}

export class GenerateReportDto {
  @IsString()
  @Matches(/^1\d{10}$/, { message: '请输入有效的11位中国大陆手机号' })
  phone: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsNumber()
  orderId?: number;

  @IsOptional()
  @IsNumber()
  productId?: number;
}
