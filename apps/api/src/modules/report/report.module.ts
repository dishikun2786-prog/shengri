import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { BaziModule } from '../bazi/bazi.module';
import { RuleEngineModule } from '../rule-engine/rule-engine.module';
import { AiModule } from '../ai/ai.module';
import { HealthModule } from '../health/health.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [BaziModule, RuleEngineModule, AiModule, HealthModule, TokenModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
