import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MapsConfig } from '../../../config/configuration';
import { MAP_PROVIDER, type MapProvider } from './map-provider.interface';
import { StubMapProvider } from './stub-map.provider';
import { YandexMapProvider } from './yandex-map.provider';

@Injectable()
export class MapProviderResolver {
  constructor(
    private readonly config: ConfigService,
    private readonly stubProvider: StubMapProvider,
    private readonly yandexProvider: YandexMapProvider,
  ) {}

  resolve(): MapProvider {
    const maps = this.config.get<MapsConfig>('maps')!;

    if (
      maps.provider === 'yandex' &&
      (maps.yandexGeosuggestApiKey || maps.yandexGeocoderApiKey)
    ) {
      return this.yandexProvider;
    }

    return this.stubProvider;
  }
}

export const mapProviderFactory = {
  provide: MAP_PROVIDER,
  useFactory: (resolver: MapProviderResolver) => resolver.resolve(),
  inject: [MapProviderResolver],
};
