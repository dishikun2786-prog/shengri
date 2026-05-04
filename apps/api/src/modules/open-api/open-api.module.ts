import { Module } from '@nestjs/common';
import { OpenApiService } from './open-api.service';
import { OpenApiController } from './open-api.controller';
import { BaziModule } from '../bazi/bazi.module';
import { RuleEngineModule } from '../rule-engine/rule-engine.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [BaziModule, RuleEngineModule, AiModule],
  controllers: [OpenApiController],
  providers: [OpenApiService],
})
export class OpenApiModule {}
