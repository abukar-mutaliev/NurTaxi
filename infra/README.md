# Инфраструктура Nur Taxi

## Локальная разработка (docker-compose)

```bash
cd infra
docker compose up -d                              # ядро: Postgres+PostGIS, Redis, NATS, MinIO
docker compose --profile observability up -d      # + Prometheus, Grafana, OTel Collector
```

| Сервис | Адрес | Доступ |
|--------|-------|--------|
| PostgreSQL + PostGIS | `127.0.0.1:5433` | локальные заглушки в compose |
| Redis | `127.0.0.1:6380` | — |
| NATS | `127.0.0.1:4222` (мониторинг `:8222`) | — |
| MinIO (S3) | API `:9000`, консоль только `127.0.0.1:9001` | заглушки в compose; на сервере свои `MINIO_ROOT_*` |
| Prometheus | `127.0.0.1:9090` | — |
| Grafana | `127.0.0.1:3001` | локальная заглушка |

> Этот `docker-compose.yml` — только для своей машины. На сервере с белым IP
> поднимайте вместе с `docker-compose.prod.yml`, иначе Postgres/Redis/NATS/MinIO
> слушают интернет. Пароли из compose и `.env.example` давно в git: если они
> ещё стоят на сервере, их нужно сменить, а не «закрыть порт и забыть».
> Консоль MinIO (`:9001`) наружу не выпускать никогда.

### Сервер с белым IP (сделать сразу)

В бакете лежат паспорта и права водителей. Сейчас снаружи открыты `:9000`/`:9001`
и порты БД. После `git pull`:

```bash
cd /var/www/test-app/NurTaxi/infra
cp .env.example .env          # задайте СВОИ MINIO_ROOT_USER и MINIO_ROOT_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
# Docker сам прописывает iptables и часто обходит ufw — закрывает bind 127.0.0.1 выше.
# ufw deny здесь только страховка на случай старого маппинга 0.0.0.0:
ufw deny 9000; ufw deny 9001; ufw deny 5433; ufw deny 6380; ufw deny 4222; ufw deny 8222
```

В `server/.env` те же ключи: `S3_ACCESS_KEY` / `S3_SECRET_KEY`,
`S3_ENDPOINT=http://127.0.0.1:9000`,
`S3_PUBLIC_ENDPOINT=https://taxi.rulplus.ru/s3`.
В nginx сайта подключите `infra/nginx/s3-proxy.conf`, затем `nginx -t && systemctl reload nginx`
и перезапуск API. Пока ключи из репозитория и публичный адрес хранилища совпадают,
backend отказывается стартовать.

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
