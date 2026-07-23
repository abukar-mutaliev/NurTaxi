import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderConfig } from './entities/provider-config.entity';
import type { CreateProviderDto, UpdateProviderDto } from './dto/admin.dto';

@Injectable()
export class AdminProvidersService {
  constructor(
    @InjectRepository(ProviderConfig)
    private readonly providers: Repository<ProviderConfig>,
  ) {}

  list(regionId?: string): Promise<ProviderConfig[]> {
    return this.providers.find({
      where: regionId ? { regionId } : {},
      order: { regionId: 'ASC', type: 'ASC' },
    });
  }

  async get(id: string): Promise<ProviderConfig> {
    const config = await this.providers.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException({ code: 'PROVIDER_NOT_FOUND', message: 'Провайдер не найден' });
    }
    return config;
  }

  async create(dto: CreateProviderDto): Promise<ProviderConfig> {
    const existing = await this.providers.findOne({
      where: { regionId: dto.regionId, type: dto.type, isActive: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'PROVIDER_EXISTS',
        message: 'Активный провайдер этого типа уже настроен для региона',
      });
    }

    return this.providers.save(
      this.providers.create({
        regionId: dto.regionId,
        type: dto.type,
        provider: dto.provider,
        credentialsRef: dto.credentialsRef,
        config: dto.config ?? {},
        isActive: true,
      }),
    );
  }

  async update(id: string, dto: UpdateProviderDto): Promise<ProviderConfig> {
    const config = await this.get(id);
    if (dto.provider !== undefined) config.provider = dto.provider;
    if (dto.credentialsRef !== undefined) config.credentialsRef = dto.credentialsRef;
    if (dto.config !== undefined) config.config = dto.config;
    if (dto.isActive !== undefined) config.isActive = dto.isActive;
    return this.providers.save(config);
  }
}
