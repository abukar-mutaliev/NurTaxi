import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationOutboxEvent } from '../../common/outbox/integration-outbox-event.entity';
import { RisService } from './ris.service';
import { StubRisChannel } from './stub-ris.channel';
import { HttpRisChannel } from './http-ris.channel';
import { RIS_CHANNEL } from './ris-channel.interface';
import { RegionsModule } from '../regions/regions.module';
import { AdminRisController } from './admin-ris.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationOutboxEvent]), RegionsModule],
  controllers: [AdminRisController],
  providers: [
    RisService,
    StubRisChannel,
    HttpRisChannel,
    {
      provide: RIS_CHANNEL,
      useFactory: (http: HttpRisChannel, stub: StubRisChannel) => (process.env.RIS_ENDPOINT ? http : stub),
      inject: [HttpRisChannel, StubRisChannel],
    },
  ],
  exports: [RisService],
})
export class RisModule {}
