import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import type { RedisConfig } from '../config/configuration';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Общий Redis-клиент (кэш, гео-индекс водителей, состояние WS-подписок).
 * Регистрируется глобально — потребляется матчингом, кэшем тарифов и др. (Des §6.2, §10).
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = config.getOrThrow<RedisConfig>('redis');
        return new Redis({
          host: redis.host,
          port: redis.port,
          password: redis.password,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          tls: redis.tls ? { rejectUnauthorized: redis.tlsRejectUnauthorized } : undefined,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<Redis>(REDIS_CLIENT, { strict: false });
    await client?.quit();
  }
}
