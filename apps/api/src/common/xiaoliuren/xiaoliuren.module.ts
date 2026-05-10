import { Global, Module } from '@nestjs/common';
import { XiaoliurenCalculatorService } from './xiaoliuren-calculator.service';

@Global()
@Module({
  providers: [XiaoliurenCalculatorService],
  exports: [XiaoliurenCalculatorService],
})
export class XiaoliurenCommonModule {}
