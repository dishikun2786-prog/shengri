import { Module, forwardRef } from '@nestjs/common';
import { PairingService } from './pairing.service';
import { PairingBillingService } from './pairing-billing.service';
import { PairingController } from './pairing.controller';
import { BaziModule } from '../bazi/bazi.module';
import { AiModule } from '../ai/ai.module';
import { ChatModule } from '../chat/chat.module';
import { OrderModule } from '../order/order.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [BaziModule, AiModule, forwardRef(() => ChatModule), OrderModule, RedisModule],
  controllers: [PairingController],
  providers: [PairingService, PairingBillingService],
  exports: [PairingService],
})
export class PairingModule {}
