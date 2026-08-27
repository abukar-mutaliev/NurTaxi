import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxiRegistryCheck } from './entities/taxi-registry-check.entity';
import { Carrier } from '../carriers/entities/carrier.entity';
import { TaxiPermit } from '../carriers/entities/taxi-permit.entity';
import { Vehicle } from '../drivers/entities/vehicle.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { DriverAssignment } from '../carriers/entities/driver-assignment.entity';
import { TaxiRegistryService } from './taxi-registry.service';
import { StubTaxiRegistryProvider } from './stub-taxi-registry.provider';
import { TAXI_REGISTRY_PROVIDER } from './taxi-registry.interface';
import { RegionsModule } from '../regions/regions.module';
import { AdminTaxiRegistryController } from './admin-taxi-registry.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaxiRegistryCheck,
      Carrier,
      TaxiPermit,
      Vehicle,
      DriverProfile,
      DriverAssignment,
    ]),
    RegionsModule,
  ],
  controllers: [AdminTaxiRegistryController],
  providers: [
    TaxiRegistryService,
    StubTaxiRegistryProvider,
    { provide: TAXI_REGISTRY_PROVIDER, useExisting: StubTaxiRegistryProvider },
  ],
  exports: [TaxiRegistryService],
})
export class TaxiRegistryModule {}
