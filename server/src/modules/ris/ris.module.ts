import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationOutboxEvent } from '../../common/outbox/integration-outbox-event.entity';
import { RisService } from './ris.service';
import { StubRisChannel } from './stub-ris.channel';
import { RIS_CHANNEL } from './ris-channel.interface';
import { RegionsModule } from '../regions/regions.module';
import { AdminRisController } from './admin-ris.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationOutboxEvent]), RegionsModule],
  controllers: [AdminRisController],
  providers: [RisService, StubRisChannel, { provide: RIS_CHANNEL, useExisting: StubRisChannel }],
  exports: [RisService],
})
export class RisModule {}
