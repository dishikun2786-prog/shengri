import { IsNumber, IsOptional, IsString, IsBoolean, Min, Max } from 'class-validator';

export class CalculateDto {
  @IsNumber() @Min(1900) @Max(2100) birthYear: number;
  @IsNumber() @Min(1) @Max(2) gender: number; // 1=男 2=女
  @IsOptional() @IsString() question?: string;
}

export class GenerateReportDto {
  @IsNumber() @Min(1900) @Max(2100) birthYear: number;
  @IsNumber() @Min(1) @Max(2) gender: number;
  @IsOptional() @IsString() question?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @IsNumber() orderId?: number;
  @IsOptional() @IsNumber() productId?: number;
  @IsOptional() @IsString() orderNo?: string;
}
