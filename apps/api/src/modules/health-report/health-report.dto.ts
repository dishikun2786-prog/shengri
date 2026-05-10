import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SymptomDto {
  @IsString() symptom: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsIn(['轻', '中', '重']) severity?: string;
}

export class CalculateDto {
  @IsOptional() @IsString() targetDate?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() birthCalendarType?: string;
  @IsOptional() @IsNumber() gender?: number;
  @IsOptional() @IsString() question?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SymptomDto) symptoms?: SymptomDto[];
  @IsOptional() @IsNumber() @Min(100) @Max(250) height?: number;
  @IsOptional() @IsNumber() @Min(30) @Max(300) weight?: number;
}

export class GenerateReportDto {
  @IsOptional() @IsString() targetDate?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() birthCalendarType?: string;
  @IsOptional() @IsNumber() gender?: number;
  @IsOptional() @IsString() question?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SymptomDto) symptoms?: SymptomDto[];
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @IsNumber() orderId?: number;
  @IsOptional() @IsNumber() productId?: number;
  @IsOptional() @IsString() orderNo?: string;
  @IsOptional() @IsNumber() @Min(100) @Max(250) height?: number;
  @IsOptional() @IsNumber() @Min(30) @Max(300) weight?: number;
}
