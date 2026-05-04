import { Module } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { DistributionModule } from '../distribution/distribution.module';

@Module({
  imports: [DistributionModule],
  controllers: [PromotionController],
  providers: [PromotionService],
})
export class PromotionModule {}
