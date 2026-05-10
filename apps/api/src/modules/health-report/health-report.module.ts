import { Module } from '@nestjs/common';
import { HealthReportController } from './health-report.controller';
import { HealthReportService } from './health-report.service';
import { RuleEngineModule } from '../rule-engine/rule-engine.module';
import { AiModule } from '../ai/ai.module';
import { TokenModule } from '../token/token.module';
@Module({ imports: [RuleEngineModule, AiModule, TokenModule], controllers: [HealthReportController], providers: [HealthReportService] })
export class HealthReportModule {}
