#!/usr/bin/env bash
# На сервере: подтянуть main, собрать API и перезапустить процесс pm2 nurtaxi-api.
# Запуск из любого каталога: bash /var/www/NurTaxi/server/scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_NAME="${PM2_APP_NAME:-nurtaxi-api}"

cd "$ROOT"
git pull --ff-only

cd "$ROOT/server"
npm install
npm run build

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME"
else
  pm2 start dist/main.js --name "$APP_NAME"
fi

pm2 status "$APP_NAME"
