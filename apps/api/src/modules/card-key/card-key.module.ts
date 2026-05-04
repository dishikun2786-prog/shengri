import { Module } from '@nestjs/common';
import { CardKeyService } from './card-key.service';
import { CardKeyController } from './card-key.controller';

@Module({
  controllers: [CardKeyController],
  providers: [CardKeyService],
  exports: [CardKeyService],
})
export class CardKeyModule {}
