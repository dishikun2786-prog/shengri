import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { WuyunliuqiService } from './wuyunliuqi.service';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [ConfigModule, TokenModule],
  controllers: [HealthController],
  providers: [WuyunliuqiService],
  exports: [WuyunliuqiService],
})
export class HealthModule {}
