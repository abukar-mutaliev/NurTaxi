# Чек-лист внутреннего аудита 580-ФЗ (фаза C9)

Дата прогона: 2026-08-27. Статус: архитектурная реализация в коде; юридические
пункты B.1–B.8 остаются открытыми.

| ID | Требование | Доказательство |
|----|------------|----------------|
| FZ-01.1 | Инфраструктура в РФ | `docs/adr/0001-infrastructure-localization.md`, `infra/terraform/yandex` |
| FZ-01.2 | Нет зарубежных default | `S3_REGION=ru-central-1` |
| FZ-01.3 | Нет eu-central-1 в примере | `infra/terraform/versions.tf` |
| FZ-01.4 | Реестр образов РФ | CI push в `CR_REGISTRY` |
| FZ-01.5 | CI-блок зарубежных зон | `.github/workflows/ci.yml` job `localization-guard` |
| FZ-01.6 | Бэкапы в РФ | ADR + inventory backups |
| FZ-02.1 | Sentry beforeSend | `server/src/observability/sentry.ts` |
| FZ-02.2 | Sentry выключен по умолчанию | `SENTRY_ENABLED=false` |
| FZ-02.3 | OTEL без параметров SQL | `tracing.ts` |
| FZ-02.4 | Push без ПДн | `docs/compliance/external-processors.md` |
| FZ-02.5 | Реестр обработчиков | этот каталог |
| FZ-02.6 | Маскирование в логах | `pii-scrubber.ts` |
| FZ-03.1 | Срок ≥ 6 мес | `app_settings.order_retention_months` |
| FZ-03.2 | Нет каскадного удаления журнала | миграция RESTRICT |
| FZ-03.3 | Триггеры неизменяемости | `nurtaxi_forbid_journal_mutation` |
| FZ-03.5 | Обезличивание | `RetentionService` |
| FZ-03.7 | Политика хранения | `retention-policy.md` |
| FZ-04.* | Перевозчик, снимок, журнал офферов | модули `carriers`, `orders` |
| FZ-05.* | Выгрузка без лимита | `RegulatoryExportService` |
| FZ-06.* | Реестр такси | `TaxiRegistryService` + stub |
| FZ-07.* | РИС | `RisService` + stub |
| FZ-08.* | Аудит чтения, TLS, CORS, секреты | interceptor, `production-security.ts` |
| FZ-09.* | Площадки | `PlacementService` |
| FZ-10.* | Роль regulator, disclosures | `Role.Regulator` |

Нагрузочный прогон выгрузки за год (C4.11 / C9.4) и обучение операторов (C9.5)
выполняются на staging после наполнения данными. Аттестация (B.7) — вне кода.
