import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegulatoryExport } from './entities/regulatory-export.entity';
import { RegulatoryDisclosure } from './entities/regulatory-disclosure.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatusLog } from '../orders/entities/order-status-log.entity';
import { RegulatoryExportService } from './regulatory-export.service';
import { AdminExportsController } from './admin-exports.controller';
import { StorageModule } from '../storage/storage.module';
import { AdminScopeModule } from '../admin/admin-scope.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegulatoryExport, RegulatoryDisclosure, Order, OrderStatusLog]),
    StorageModule,
    AdminScopeModule,
  ],
  controllers: [AdminExportsController],
  providers: [RegulatoryExportService],
  exports: [RegulatoryExportService],
})
export class RegulatoryModule {}
