import { Module } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { ConversionController } from './conversion.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ConversionController],
  providers: [ConversionService],
  exports: [ConversionService],
})
export class ConversionModule {}
