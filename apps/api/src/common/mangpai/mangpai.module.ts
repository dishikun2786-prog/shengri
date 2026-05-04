import { Global, Module } from '@nestjs/common';
import { MangpaiCalculatorService } from './mangpai-calculator.service';
import { ChuanGongService } from './chuan-gong.service';

@Global()
@Module({
  providers: [MangpaiCalculatorService, ChuanGongService],
  exports: [MangpaiCalculatorService, ChuanGongService],
})
export class MangpaiModule {}
