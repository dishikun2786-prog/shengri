import { Global, Module } from '@nestjs/common';
import { HealthCalculatorService } from './health-calculator.service';

@Global()
@Module({ providers: [HealthCalculatorService], exports: [HealthCalculatorService] })
export class HealthCommonModule {}
