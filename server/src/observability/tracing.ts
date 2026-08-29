/**
 * Инициализация OpenTelemetry. Должна быть импортирована САМОЙ ПЕРВОЙ в main.ts,
 * до NestJS и любых инструментируемых библиотек, иначе авто-инструментация не
 * перехватит модули (http, pg, ioredis, nats и т.д.).
 *
 * Управляется флагом OTEL_ENABLED, чтобы в локальной разработке не тянуть экспортёр.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

export function initTracing(): void {
  if (process.env.OTEL_ENABLED?.toLowerCase() !== 'true') {
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/traces`,
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'nurtaxi-backend',
      [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? '0.1.0',
    }),
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Шумные инструментации файловой системы отключаем.
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (req) => {
            const url = req.url ?? '';
            return url.startsWith('/metrics') || url.includes('/health');
          },
          headersToSpanAttributes: { client: { requestHeaders: [] } },
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
          enhancedDatabaseReporting: false,
        },
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    sdk
      ?.shutdown()
      .catch((err) => console.error('Ошибка остановки OpenTelemetry', err))
      .finally(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
