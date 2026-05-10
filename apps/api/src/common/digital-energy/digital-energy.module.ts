import { Global, Module } from '@nestjs/common';
import { DigitalEnergyCalculatorService } from './digital-energy-calculator.service';

@Global()
@Module({
  providers: [DigitalEnergyCalculatorService],
  exports: [DigitalEnergyCalculatorService],
})
export class DigitalEnergyCommonModule {}
