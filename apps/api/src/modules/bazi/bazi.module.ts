import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BaziService } from './bazi.service';
import { BaziController } from './bazi.controller';

@Module({
  imports: [HttpModule],
  controllers: [BaziController],
  providers: [BaziService],
  exports: [BaziService],
})
export class BaziModule {}
