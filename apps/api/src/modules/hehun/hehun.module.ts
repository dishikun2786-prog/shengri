import { Module } from '@nestjs/common';
import { HehunService } from './hehun.service';
import { HehunController } from './hehun.controller';
import { BaziModule } from '../bazi/bazi.module';
import { RuleEngineModule } from '../rule-engine/rule-engine.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [BaziModule, RuleEngineModule, AiModule],
  controllers: [HehunController],
  providers: [HehunService],
  exports: [HehunService],
})
export class HehunModule {}
