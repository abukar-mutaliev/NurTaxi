# Nur Taxi

Специализированная платформа заказа такси для женщин и семей (Северный Кавказ).
Перевозки выполняются исключительно женщинами-водителями.

> Документы проекта: [`requirements.md`](./requirements.md) (SRS), [`design.md`](./design.md)
> (технические решения), [`tasks.md`](./tasks.md) (план реализации по фазам).

## Архитектура

Модульный монолит на **NestJS (TypeScript)** с чёткими границами модулей, готовый к
выделению в микросервисы (см. `design.md` §2). Ключевое правило: различия между регионами
и подключение новых услуг решаются **данными и конфигурацией**, а не изменением кода.

| Слой | Технология |
|------|------------|
| Backend | NestJS (Node.js 20, TypeScript) |
| БД | PostgreSQL + PostGIS |
| Кэш / гео / сессии | Redis |
| Брокер событий | NATS (JetStream) |
| Хранилище файлов | S3-совместимое (MinIO в dev) |
| Реальное время | WebSocket (Socket.IO) |
| Наблюдаемость | OpenTelemetry, Prometheus, Grafana, Sentry |

## Структура репозитория (монорепо)

```
NurTaxi/
├── server/             # NestJS API (модульный монолит)
├── infra/              # Инфраструктура
│   ├── docker-compose.yml   # Локальное dev-окружение
│   ├── helm/                # Helm chart для Kubernetes
│   └── terraform/           # IaC для staging/prod
├── .github/workflows/  # CI/CD (GitHub Actions)
├── requirements.md     # Спецификация требований (SRS)
├── design.md           # Технические решения
└── tasks.md            # План реализации по фазам
```

Мобильные приложения (Flutter) и веб-админки (React) добавляются в `mobile/` и `web-admin/`
на последующих фазах.

## Быстрый старт (dev)

Требования: Node.js 20+, Docker + Docker Compose.

```bash
# 1. Поднять инфраструктуру (Postgres+PostGIS, Redis, MinIO, NATS)
cd infra
docker compose up -d

# 2. Установить зависимости сервера
cd ../server
npm install

# 3. Настроить окружение
cp .env.example .env

# 4. Применить миграции БД
npm run migration:run

# 5. Запустить в режиме разработки
npm run start:dev
```

После запуска:

- API: <http://localhost:3000/api/v1>
- Health (liveness): <http://localhost:3000/api/v1/health/live>
- Health (readiness): <http://localhost:3000/api/v1/health/ready>
- Метрики Prometheus: <http://localhost:3000/metrics>
- Swagger (OpenAPI): <http://localhost:3000/api/docs>

## Фазы реализации

Проект реализуется по фазам согласно [`tasks.md`](./tasks.md). Текущий статус:

- **Фаза 0 — Фундамент и инфраструктура** — в работе (каркас server, dev-инфраструктура,
  наблюдаемость, миграции, CI/CD, IaC-скелет).
