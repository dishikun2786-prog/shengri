import { Global, Module } from '@nestjs/common';
import { LuniSolarService } from './lunisolar.service';

@Global()
@Module({
  providers: [LuniSolarService],
  exports: [LuniSolarService],
})
export class LuniSolarModule {}
