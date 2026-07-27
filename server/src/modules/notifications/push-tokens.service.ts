import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PushPlatform } from '../../common/enums/phase8.enum';
import { PushDeviceToken } from './entities/push-device-token.entity';

@Injectable()
export class PushTokensService {
  constructor(
    @InjectRepository(PushDeviceToken)
    private readonly tokens: Repository<PushDeviceToken>,
  ) {}

  listForUser(userId: string): Promise<PushDeviceToken[]> {
    return this.tokens.find({ where: { userId } });
  }

  async register(
    userId: string,
    token: string,
    platform: PushPlatform,
    deviceId?: string,
  ): Promise<PushDeviceToken> {
    const existing = await this.tokens.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      existing.deviceId = deviceId ?? null;
      return this.tokens.save(existing);
    }

    return this.tokens.save(
      this.tokens.create({
        userId,
        token,
        platform,
        deviceId: deviceId ?? null,
      }),
    );
  }

  async unregister(userId: string, token: string): Promise<void> {
    await this.tokens.delete({ userId, token });
  }

  async unregisterAllForUser(userId: string): Promise<void> {
    await this.tokens.delete({ userId });
  }
}
