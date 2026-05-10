import { Global, Module } from '@nestjs/common';
import { BazhaiCalculatorService } from './bazhai-calculator.service';

@Global()
@Module({ providers: [BazhaiCalculatorService], exports: [BazhaiCalculatorService] })
export class BazhaiCommonModule {}
