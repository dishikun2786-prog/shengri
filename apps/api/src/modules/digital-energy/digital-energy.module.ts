import { Module } from '@nestjs/common';
import { DigitalEnergyController } from './digital-energy.controller';
import { DigitalEnergyService } from './digital-energy.service';
import { RuleEngineModule } from '../rule-engine/rule-engine.module';
import { AiModule } from '../ai/ai.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [RuleEngineModule, AiModule, TokenModule],
  controllers: [DigitalEnergyController],
  providers: [DigitalEnergyService],
})
export class DigitalEnergyModule {}
