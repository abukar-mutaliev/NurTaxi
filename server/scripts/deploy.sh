#!/usr/bin/env bash
# На сервере, из корня репозитория: npm run deploy
# Подтягивает main, собирает образ API, применяет новые миграции и перезапускает только api.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HEALTH_URL="${HEALTH_URL:-https://taxi.rulplus.ru/api/v1/health/ready}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

cd "$ROOT"

if [[ "${DEPLOY_SKIP_PULL:-0}" != "1" ]]; then
  before="$(git rev-parse HEAD)"
  git pull --ff-only
  after="$(git rev-parse HEAD)"
  # Скрипт уже прочитан bash. Если pull принёс новую версию — запустить её.
  if [[ "$before" != "$after" ]]; then
    DEPLOY_SKIP_PULL=1 exec bash "$ROOT/server/scripts/deploy.sh"
  fi
fi

cd "$ROOT/infra"

if ! "${COMPOSE[@]}" config --services | grep -qx 'api'; then
  echo "В docker compose нет сервиса api. Добавьте его в infra и повторите." >&2
  exit 1
fi

echo "Сборка API..."
"${COMPOSE[@]}" build api

echo "Миграции (если новых нет, TypeORM ничего не меняет)..."
if ! "${COMPOSE[@]}" run --rm --no-deps --name nurtaxi-api-migrate -T api npm run migration:run:prod; then
  echo "Миграции не применились. Работающий контейнер API не перезапускался." >&2
  exit 1
fi

echo "Перезапуск API..."
"${COMPOSE[@]}" up -d --no-deps --force-recreate api
"${COMPOSE[@]}" ps api

echo "Проверка ${HEALTH_URL}"
code="000"
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)"
  if [[ "$code" == "200" ]]; then
    printf 'NurTaxi API: HTTP %s\n' "$code"
    exit 0
  fi
  sleep 2
done

printf 'NurTaxi API: HTTP %s\n' "$code"
echo "API не ответил 200. Контейнер перезапущен, смотрите логи: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=80 api" >&2
exit 1
