import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RoutingConfig } from '../../../config/configuration';
import { OsrmRoutingProvider } from './osrm-routing.provider';
import { ROUTING_PROVIDER, type RoutingProvider } from './routing-provider.interface';
import { StubRoutingProvider } from './stub-routing.provider';

@Injectable()
export class RoutingProviderResolver {
  constructor(
    private readonly config: ConfigService,
    private readonly stubRouting: StubRoutingProvider,
    private readonly osrmRouting: OsrmRoutingProvider,
  ) {}

  resolve(): RoutingProvider {
    const routing = this.config.get<RoutingConfig>('routing')!;

    if (routing.provider === 'osrm' && routing.osrmBaseUrl) {
      return this.osrmRouting;
    }

    return this.stubRouting;
  }
}

export const routingProviderFactory = {
  provide: ROUTING_PROVIDER,
  useFactory: (resolver: RoutingProviderResolver) => resolver.resolve(),
  inject: [RoutingProviderResolver],
};
