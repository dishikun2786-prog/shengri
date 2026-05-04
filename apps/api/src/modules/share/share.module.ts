import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ShareService } from './share.service';
import { ReportShareController } from './report-share.controller';
import { ShareController } from './share.controller';
import { UserShareController } from './user-share.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReportShareController, ShareController, UserShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
