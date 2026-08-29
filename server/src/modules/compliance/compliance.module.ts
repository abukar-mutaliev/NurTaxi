import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting, RetentionPurgeRun } from './entities/retention.entity';
import { RetentionService } from './retention.service';
import { AdminRetentionController } from './admin-retention.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppSetting, RetentionPurgeRun])],
  controllers: [AdminRetentionController],
  providers: [RetentionService],
  exports: [RetentionService],
})
export class ComplianceModule {}
