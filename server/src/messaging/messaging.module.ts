import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { connect, type NatsConnection } from 'nats';
import type { NatsConfig } from '../config/configuration';
import { EventBusService } from './event-bus.service';
import { NATS_CONNECTION } from './messaging.constants';

/**
 * Подключение к брокеру событий NATS. Соединение не блокирует старт приложения:
 * при недоступности брокера сервис поднимается (graceful degradation, Des §11),
 * а публикация событий логируется как пропущенная.
 */
@Global()
@Module({
  providers: [
    {
      provide: NATS_CONNECTION,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<NatsConnection | null> => {
        const logger = new Logger('MessagingModule');
        const { url } = config.getOrThrow<NatsConfig>('nats');
        try {
          const connection = await connect({ servers: url, name: 'nurtaxi-backend' });
          logger.log(`Подключено к NATS: ${url}`);
          return connection;
        } catch (err) {
          logger.warn(`Не удалось подключиться к NATS (${url}): ${(err as Error).message}`);
          return null;
        }
      },
    },
    EventBusService,
  ],
  exports: [EventBusService, NATS_CONNECTION],
})
export class MessagingModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const connection = this.moduleRef.get<NatsConnection | null>(NATS_CONNECTION, {
      strict: false,
    });
    await connection?.drain();
  }
}
