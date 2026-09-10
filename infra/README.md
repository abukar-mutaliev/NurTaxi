# Инфраструктура Nur Taxi

## Локальная разработка (docker-compose)

```bash
cd infra
docker compose up -d                              # ядро: Postgres+PostGIS, Redis, NATS, MinIO
docker compose --profile observability up -d      # + Prometheus, Grafana, OTel Collector
```

| Сервис | Адрес | Доступ |
|--------|-------|--------|
| PostgreSQL + PostGIS | `localhost:5433` | nurtaxi / nurtaxi |
| Redis | `localhost:6380` | — |
| NATS | `localhost:4222` (мониторинг `:8222`) | — |
| MinIO (S3) | API `:9000`, консоль `:9001` | nurtaxi / nurtaxi123 |
| Prometheus | `localhost:9090` | — |
| Grafana | `localhost:3001` | admin / admin |

> Пароли в таблице — только для локальной машины, и этот `docker-compose.yml` рассчитан
> именно на неё. На сервере задайте `MINIO_ROOT_USER` и `MINIO_ROOT_PASSWORD` своими
> значениями: в бакете лежат паспорта и водительские удостоверения, а консоль MinIO
> с паролем по умолчанию отдаёт их любому, кто до неё дотянется. Консоль (`:9001`)
> намеренно слушает только `127.0.0.1` — наружу её выпускать не нужно никогда.

### Адрес хранилища для мобильных приложений

`S3_ENDPOINT` — как сервер ходит в хранилище (обычно `localhost:9000`).
`S3_PUBLIC_ENDPOINT` — что попадает в ссылку на загрузку, а её открывает **телефон**.

Поэтому публичный адрес обязан быть виден из интернета. Локальный адрес (`192.168.*`,
`10.*`, `localhost`) означает, что загрузка файлов не работает ни у кого, кроме той же
сети, — при этом приложение просто долго ждёт. Сервер предупреждает об этом в логе при
запуске, а в `production` отказывается стартовать.

## Окружения

`dev` → `staging` → `production` (Req §26).

- **dev** — локально через docker-compose, секреты из `.env` в каталоге `server/`.
- **staging / production** — Kubernetes; конфигурация через Helm `values`, секреты — из
  Vault (см. ниже). Деплой — `terraform apply` + Helm.

## Управление секретами (Vault)

Секреты **никогда** не хранятся в репозитории (Req §26, Des §9, §14).

- **dev:** значения берутся из `.env` (`SECRETS_PROVIDER=env`).
- **staging/prod:** секреты хранятся в HashiCorp Vault и синхронизируются в Kubernetes
  Secret `nurtaxi-backend-secrets` (например, через External Secrets Operator или Vault
  Agent Injector). Helm-chart подключает этот Secret через `envFrom.secretRef`.

Минимальный набор секретных ключей:

```
DB_PASSWORD, REDIS_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
S3_ACCESS_KEY, S3_SECRET_KEY, SENTRY_DSN, <credentials провайдеров карт/SMS/платежей>
```

## Kubernetes (Helm)

```bash
helm upgrade --install nurtaxi ./helm/nurtaxi-backend \
  --namespace nurtaxi-staging --create-namespace \
  --set image.tag=<git-sha>
```

## IaC (Terraform)

```bash
cd terraform
terraform init
terraform plan  -var="environment=staging" -var="backend_image=ghcr.io/nurtaxi/nurtaxi-backend:<tag>"
terraform apply -var="environment=staging" -var="backend_image=ghcr.io/nurtaxi/nurtaxi-backend:<tag>"
```
