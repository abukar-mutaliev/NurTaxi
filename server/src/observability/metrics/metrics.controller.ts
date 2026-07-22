import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @ApiExcludeEndpoint()
  async getMetrics(@Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', this.metricsService.contentType());
    res.send(await this.metricsService.metrics());
  }
}
