import { Module } from '@nestjs/common';
import { XiaoliurenController } from './xiaoliuren.controller';
import { XiaoliurenService } from './xiaoliuren.service';
import { RuleEngineModule } from '../rule-engine/rule-engine.module';
import { AiModule } from '../ai/ai.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [RuleEngineModule, AiModule, TokenModule],
  controllers: [XiaoliurenController],
  providers: [XiaoliurenService],
})
export class XiaoliurenModule {}
