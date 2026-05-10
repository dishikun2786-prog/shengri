import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { BaziModule } from './modules/bazi/bazi.module';
import { RuleEngineModule } from './modules/rule-engine/rule-engine.module';
import { AiModule } from './modules/ai/ai.module';
import { ReportModule } from './modules/report/report.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { HehunModule } from './modules/hehun/hehun.module';
import { ConversionModule } from './modules/conversion/conversion.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { CrmModule } from './modules/crm/crm.module';
import { MasterModule } from './modules/master/master.module';
import { OpenApiModule } from './modules/open-api/open-api.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { Mem0Module } from './common/mem0/mem0.module';
import { LuniSolarModule } from './common/lunisolar/lunisolar.module';
import { MangpaiModule } from './common/mangpai/mangpai.module';
import { ChatModule } from './modules/chat/chat.module';
import { CardKeyModule } from './modules/card-key/card-key.module';
import { SysConfigModule } from './modules/config/config.module';
import { MomentsModule } from './modules/moments/moments.module';
import { UploadModule } from './modules/upload/upload.module';
import { HealthModule } from './modules/health/health.module';
import { TokenModule } from './modules/token/token.module';
import { ShareModule } from './modules/share/share.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { PairingModule } from './modules/pairing/pairing.module';
import { NotificationModule } from './modules/notification/notification.module';
import { XiaoliurenModule } from './modules/xiaoliuren/xiaoliuren.module';
import { XiaoliurenCommonModule } from './common/xiaoliuren/xiaoliuren.module';
import { DigitalEnergyCommonModule } from './common/digital-energy/digital-energy.module';
import { DigitalEnergyModule } from './modules/digital-energy/digital-energy.module';
import { BazhaiCommonModule } from './common/bazhai/bazhai.module';
import { BazhaiModule } from './modules/bazhai/bazhai.module';
import { HealthCommonModule } from './common/health/health.module';
import { HealthReportModule } from './modules/health-report/health-report.module';
import { SmsModule } from './common/sms/sms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    CryptoModule,
    Mem0Module,
    LuniSolarModule,
    MangpaiModule,
    AuthModule,
    UserModule,
    BaziModule,
    RuleEngineModule,
    AiModule,
    ReportModule,
    OrderModule,
    PaymentModule,
    HehunModule,
    ConversionModule,
    DistributionModule,
    CrmModule,
    MasterModule,
    OpenApiModule,
    AdminModule,
    ChatModule,
    CardKeyModule,
    SysConfigModule,
    MomentsModule,
    UploadModule,
    HealthModule,
    TokenModule,
    ShareModule,
    PromotionModule,
    PairingModule,
    NotificationModule,
    XiaoliurenCommonModule,
    XiaoliurenModule,
    DigitalEnergyCommonModule,
    DigitalEnergyModule,
    BazhaiCommonModule,
    BazhaiModule,
    HealthCommonModule,
    HealthReportModule,
    SmsModule,
  ],
})
export class AppModule {}
