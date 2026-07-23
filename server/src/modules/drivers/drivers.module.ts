import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { RegionsModule } from '../regions/regions.module';
import { PaymentsModule } from '../payments/payments.module';
import { DriverProfile } from './entities/driver-profile.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { Vehicle } from './entities/vehicle.entity';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { DOCUMENT_AUTO_VERIFIER } from './verification/document-auto-verifier.interface';
import { NoOpDocumentAutoVerifier } from './verification/noop-document-auto-verifier';
import { DriverLocationService } from './location/driver-location.service';
import { RealtimeModule } from '../realtime/realtime.module';

/**
 * Drivers & Verification (Des §2.3): анкеты водителей, документы (приватный S3),
 * статусы верификации, статус «на линии/офлайн», геопозиция Redis GEO.
 * Фаза 2–4 (Req §8.2, §8.4, Des §6.2).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DriverProfile, DriverDocument, Vehicle]),
    StorageModule,
    UsersModule,
    RegionsModule,
    forwardRef(() => RealtimeModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [DriversController],
  providers: [
    DriversService,
    DriverLocationService,
    { provide: DOCUMENT_AUTO_VERIFIER, useClass: NoOpDocumentAutoVerifier },
  ],
  exports: [DriversService, DriverLocationService],
})
export class DriversModule {}
