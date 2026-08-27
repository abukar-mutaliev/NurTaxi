import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacementSite } from './entities/placement-site.entity';
import { PlacementComponent } from './entities/placement-component.entity';
import { PlacementSubcontractor } from './entities/placement-subcontractor.entity';
import { PlacementSiteLog } from './entities/placement-site-log.entity';
import { PlacementService } from './placement.service';
import { AdminPlacementController } from './admin-placement.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlacementSite,
      PlacementComponent,
      PlacementSubcontractor,
      PlacementSiteLog,
    ]),
  ],
  controllers: [AdminPlacementController],
  providers: [PlacementService],
  exports: [PlacementService],
})
export class PlacementModule {}
