# Nur Taxi

Специализированная платформа заказа такси для женщин и семей (Северный Кавказ).
Перевозки выполняются исключительно женщинами-водителями.

> Документы проекта: [`docs/requirements.md`](./docs/requirements.md) (SRS),
> [`docs/design.md`](./docs/design.md) (технические решения),
> [`docs/tasks.md`](./docs/tasks.md) (план реализации по фазам).

**Статус backend MVP:** фазы 0–10 по [`docs/tasks.md`](./docs/tasks.md) завершены для серверной
части. API готов к интеграции с мобильными клиентами и веб-админкой; пилот в App Store /
Google Play (задача 10.5) — отдельный трек.

## Архитектура

Модульный монолит на **NestJS (TypeScript)** с чёткими границами модулей, готовый к
выделению в микросервисы (см. `docs/design.md` §2). Ключевое правило: различия между регионами
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

### Основные доменные модули (server)

Auth · Users · Drivers · Regions · Geo · Tariffs · Orders · Matching · Realtime · SOS ·
Payments · Ledger · Notifications · Reviews · Family · Promo · Admin · Analytics

## Структура репозитория (монорепо)

```
NurTaxi/
├── server/                  # NestJS API (модульный монолит)
│   ├── src/                 # Исходный код модулей
│   └── test/                # E2E, contract, security-тесты (Фаза 10)
├── infra/                   # Инфраструктура
│   ├── docker-compose.yml   # Локальное dev-окружение
│   ├── helm/                # Helm chart для Kubernetes
│   ├── terraform/           # IaC для staging/prod
│   ├── observability/       # Prometheus, алёрты KPI
│   └── load/                # k6 smoke / нагрузочные сценарии
├── docs/                    # SRS, design, tasks, web.tasks
├── .github/workflows/       # CI/CD (GitHub Actions)
└── README.md
```

Мобильные приложения (Flutter) и веб-админки (React) — отдельные треки (`mobile/`,
`web-admin/`); см. [`docs/web.tasks.md`](./docs/web.tasks.md).

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

# 5. Загрузить тестовые данные (регион Ингушетия, пользователи, водители, заказы)
npm run seed

# 6. Запустить в режиме разработки
npm run start:dev
```

После запуска:

- API: <http://localhost:3000/api/v1>
- Health (liveness): <http://localhost:3000/api/v1/health/live>
- Health (readiness): <http://localhost:3000/api/v1/health/ready>
- Метрики Prometheus: <http://localhost:3000/metrics>
- Swagger (OpenAPI): <http://localhost:3000/api/docs>

### Авторизация в dev

Паролей нет — вход через OTP. В dev код возвращается в ответе `POST /api/v1/auth/otp/request`.

```bash
# Запрос кода
curl -X POST http://localhost:3000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79280000001"}'

# Подтверждение (code из поля devCode)
curl -X POST http://localhost:3000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79280000001","code":"1234"}'
```

Тестовые пользователи после `npm run seed` — см. вывод команды seed (клиенты, водители,
админы, оператор).

## Тестирование

```bash
cd server

npm run lint          # ESLint
npm test              # Unit-тесты
npm run test:e2e      # E2E + contract + security (нужны Postgres + Redis)
npm run test:contract # Только OpenAPI contract
npm run test:security # Только RBAC / изоляция регионов
```

E2E локально (после `migration:run` и `seed`):

```powershell
$env:E2E_ENABLED="true"
npm run test:e2e
```

Нагрузочный smoke (k6, сервер должен быть запущен):

```bash
k6 run ../infra/load/k6-smoke.js
```

CI (GitHub Actions): lint → unit → миграции → seed → e2e → build → Docker → Trivy scan.

## Фазы реализации

Backend реализован по [`docs/tasks.md`](./docs/tasks.md). Все **10 фаз серверной части**
завершены:

| Фаза | Содержание | Статус |
|------|------------|--------|
| **0** | Фундамент: NestJS, docker-compose, миграции, CI/CD, observability | ✅ |
| **1** | Auth (OTP/JWT), профили, RBAC, согласие ПДн | ✅ |
| **2** | Водители, документы, верификация, статус «на линии» | ✅ |
| **3** | Регионы, гео, тарифы, расчёт цены, любимые адреса | ✅ |
| **4** | Заказы, state machine, матчинг, отмена | ✅ |
| **5** | WebSocket, отслеживание, SOS, экстренные контакты | ✅ |
| **6** | Платежи, ledger, чеки, payout, retry | ✅ |
| **7** | Admin API: регионы, тарифы, провайдеры, операторская консоль | ✅ |
| **8** | Уведомления, история, отзывы, семья, промо | ✅ |
| **9** | KPI-метрики, resilience, кэш, audit log, алёрты | ✅ |
| **10** | Unit/e2e/contract/security-тесты, UAT UC-1…UC-5, k6 | ✅ |

**DoD backend MVP:** сквозные сценарии UC-1…UC-5 покрыты автотестами; KPI-метрики и алёрты
настроены; CI проходит lint, тесты и сборку.

### Вне scope backend (следующие шаги)

- **10.5** — публикация мобильных приложений и пилот в Ингушетии
- **1.6 / 7.x UI** — Flutter-клиент и React web-admin ([`docs/web.tasks.md`](./docs/web.tasks.md))
- **P2** — новые регионы, OCR-верификация, микросервисы (см. конец `docs/tasks.md`)

## KPI (целевые, Req §10.1)

| Показатель | Цель |
|------------|------|
| Среднее время назначения водителя | ≤ 30 с |
| Латентность API (p95, без сети) | < 300 ms |
| Доступность инфраструктуры | ≥ 99,9% |

Метрики: `order_driver_assignment_duration_seconds`, `http_request_duration_seconds`,
`payments_total`, `service_ready` — эндпоинт `/metrics`.
