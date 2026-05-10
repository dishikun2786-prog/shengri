import { IsString, IsNumber, IsOptional, IsIn, Min, Max, IsBoolean } from 'class-validator';

export class CalculateDto {
  @IsString()
  @IsIn(['time', 'random'])
  inputType: 'time' | 'random';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  day?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  hour?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  random1?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  random2?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  random3?: number;

  @IsOptional()
  @IsString()
  question?: string;
}

export class GenerateReportDto {
  @IsString()
  @IsIn(['time', 'random'])
  inputType: 'time' | 'random';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  day?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  hour?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  random1?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  random2?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  random3?: number;

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
