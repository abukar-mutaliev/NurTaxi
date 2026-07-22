import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AppConfig } from './config/configuration';

@ApiTags('service')
@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Информация о сервисе' })
  getServiceInfo() {
    const app = this.config.getOrThrow<AppConfig>('app');
    return {
      service: app.name,
      status: 'ok',
      environment: app.env,
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
