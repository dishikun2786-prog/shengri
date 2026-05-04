import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminAiController } from './admin-ai.controller';
import { AdminActionsController } from './admin-actions.controller';
import { AdminConfigController } from './admin-config.controller';
import { AiModule } from '../ai/ai.module';
import { DistributionModule } from '../distribution/distribution.module';
import { MasterModule } from '../master/master.module';
import { ChatModule } from '../chat/chat.module';
import { CardKeyModule } from '../card-key/card-key.module';

import { AdminTokenController } from './admin-token.controller';
import { AdminPairingController } from './admin-pairing.controller';

@Module({
  imports: [AiModule, DistributionModule, MasterModule, ChatModule, CardKeyModule],
  controllers: [AdminDashboardController, AdminAiController, AdminActionsController, AdminConfigController, AdminTokenController, AdminPairingController, AdminController],
})
export class AdminModule {}
