import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrier } from './entities/carrier.entity';
import { TaxiPermit } from './entities/taxi-permit.entity';
import { DriverAssignment } from './entities/driver-assignment.entity';
import { Vehicle } from '../drivers/entities/vehicle.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { CarriersService } from './carriers.service';
import { AssignmentSnapshotService } from './assignment-snapshot.service';
import { AdminCarriersController } from './admin-carriers.controller';
import { AdminScopeModule } from '../admin/admin-scope.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Carrier, TaxiPermit, DriverAssignment, Vehicle, DriverProfile]),
    AdminScopeModule,
  ],
  controllers: [AdminCarriersController],
  providers: [CarriersService, AssignmentSnapshotService],
  exports: [CarriersService, AssignmentSnapshotService, TypeOrmModule],
})
export class CarriersModule {}
