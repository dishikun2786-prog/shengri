import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { ProductPublicController } from './product-public.controller';

@Global()
@Module({
  imports: [NestConfigModule],
  controllers: [ConfigController, ProductPublicController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class SysConfigModule {}
