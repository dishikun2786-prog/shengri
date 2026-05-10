import { Module } from '@nestjs/common';
import { BazhaiController } from './bazhai.controller';
import { BazhaiService } from './bazhai.service';
import { RuleEngineModule } from '../rule-engine/rule-engine.module';
import { AiModule } from '../ai/ai.module';
import { TokenModule } from '../token/token.module';
@Module({ imports: [RuleEngineModule, AiModule, TokenModule], controllers: [BazhaiController], providers: [BazhaiService] })
export class BazhaiModule {}
