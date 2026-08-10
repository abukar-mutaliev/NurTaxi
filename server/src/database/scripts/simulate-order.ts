/**
 * Эмуляция заказа для проверки приложения водителя (Req §8.10, §15.3).
 *
 * Скрипт ходит только по публичному API — тем же путём, что и настоящие приложения:
 *   1. входит по OTP за водителя, выводит его на линию и ставит его позицию в точку подачи;
 *   2. входит по OTP за клиента и создаёт заказ;
 *   3. подбор выбирает водителя и шлёт ему `order.offer` по WebSocket —
 *      на телефоне появляется карточка «Новый заказ»;
 *   4. с `--watch` печатает смену статусов, пока водитель ведёт поездку в приложении.
 *
 * Примеры:
 *   npm run order:simulate
 *   npm run order:simulate -- --watch
 *   npm run order:simulate -- --driver-phone=+79280000012 --no-online
 *   npm run order:simulate -- --api=http://192.168.50.122:3000/api/v1 --watch
 */
import 'reflect-metadata';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv();

const DEFAULTS = {
  api: process.env.SIMULATE_API_URL ?? 'http://localhost:3000/api/v1',
  driverPhone: '+79280000011',
  // Клиент 2, а не 1: у первого в seed уже есть активный заказ, а правило «один активный
  // заказ на клиента» (§9) не даст создать второй.
  clientPhone: '+79280000002',
  regionId: '00000000-0000-4000-8000-000000000001',
  // Назрань: центр → железнодорожный вокзал (обе точки есть в справочнике StubMapProvider).
  pickup: { lat: 43.2167, lng: 44.7667, address: 'г. Назрань, ул. Московская, 1' },
  dropoff: { lat: 43.2125, lng: 44.759, address: 'г. Назрань, железнодорожный вокзал' },
};

const USAGE = `
Эмуляция заказа для приложения водителя.

  npm run order:simulate -- --watch

Опции:
  --api=<url>              базовый URL API (по умолчанию ${DEFAULTS.api})
  --driver-phone=<тел>     водитель, которому уйдёт заказ (${DEFAULTS.driverPhone})
  --client-phone=<тел>     от чьего имени создаётся заказ (${DEFAULTS.clientPhone})
  --pickup=<lat,lng>       точка подачи (${DEFAULTS.pickup.lat},${DEFAULTS.pickup.lng})
  --dropoff=<lat,lng>      точка назначения (${DEFAULTS.dropoff.lat},${DEFAULTS.dropoff.lng})
  --payment=cash|card      способ оплаты (cash)
  --comment=<текст>        комментарий клиента
  --no-online              не трогать статус и позицию водителя (он уже на линии сам)
  --watch                  следить за статусами заказа до завершения
  --reset                  только отменить незавершённые заказы клиента и выйти

Повторный запуск безопасен: токены кэшируются на 15 минут (лимит запросов кода —
3 в минуту), а прошлый незавершённый заказ клиента отменяется автоматически.
`;

interface Point {
  lat: number;
  lng: number;
  address: string;
}

interface Args {
  api: string;
  driverPhone: string;
  clientPhone: string;
  pickup: Point;
  dropoff: Point;
  payment: 'cash' | 'card';
  comment: string;
  forceOnline: boolean;
  watch: boolean;
  reset: boolean;
}

function parseArgs(argv: string[]): Args {
  const value = (name: string): string | undefined => {
    const found = argv.find((arg) => arg.startsWith(`--${name}=`));
    return found?.slice(name.length + 3);
  };

  const point = (name: string, fallback: Point): Point => {
    const raw = value(name);
    if (!raw) return fallback;

    const [lat, lng] = raw.split(',').map((part) => Number(part.trim()));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Не разобрать координаты --${name}=${raw} (ожидается lat,lng)`);
    }
    return { lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  };

  const payment = value('payment') === 'card' ? 'card' : 'cash';

  return {
    api: (value('api') ?? DEFAULTS.api).replace(/\/$/, ''),
    driverPhone: value('driver-phone') ?? DEFAULTS.driverPhone,
    clientPhone: value('client-phone') ?? DEFAULTS.clientPhone,
    pickup: point('pickup', DEFAULTS.pickup),
    dropoff: point('dropoff', DEFAULTS.dropoff),
    payment,
    comment: value('comment') ?? 'Тестовый заказ (симуляция)',
    forceOnline: !argv.includes('--no-online'),
    watch: argv.includes('--watch'),
    reset: argv.includes('--reset'),
  };
}

class ApiError extends Error {
  retryAfterSec?: number;

  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: unknown,
  ) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: { message?: string } }).error?.message ?? status)
        : String(status);
    super(`${message} (${status} ${url})`);
    this.name = 'ApiError';
  }
}

async function api<T>(
  base: string,
  path: string,
  init: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const url = `${base}${path}`;
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new ApiError(response.status, path, payload);
    const retryAfter = Number(response.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      error.retryAfterSec = retryAfter;
    }
    throw error;
  }
  return payload as T;
}

/**
 * Кэш токенов между запусками.
 *
 * `POST /auth/otp/request` ограничен тремя запросами в минуту на IP, а один прогон тратит
 * два (водитель и клиент) — второй запуск подряд упирался в 429. Токен живёт 15 минут,
 * поэтому повторные прогоны в этом окне обходятся вообще без запроса кода.
 */
const TOKEN_CACHE_FILE = join(tmpdir(), 'nurtaxi-simulate-tokens.json');

function readTokenCache(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(TOKEN_CACHE_FILE, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeTokenCache(cache: Record<string, string>): void {
  try {
    writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cache), 'utf8');
  } catch {
    // Кэш — только ускорение; без него скрипт просто снова спросит код.
  }
}

/** Проверка срока JWT без похода на сервер: берём `exp` из payload. */
function isTokenFresh(token: string): boolean {
  const payload = token.split('.')[1];
  if (!payload) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    return typeof decoded.exp === 'number' && decoded.exp * 1000 - Date.now() > 60_000;
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Вход по OTP: в dev код возвращается прямо в ответе (`OtpService`). */
async function login(base: string, phone: string): Promise<string> {
  const cacheKey = `${base}|${phone}`;
  const cache = readTokenCache();
  const cached = cache[cacheKey];

  if (cached && isTokenFresh(cached)) {
    console.log(`${phone}: используется сохранённый токен`);
    return cached;
  }

  const requested = await requestOtpWithRetry(base, phone);

  if (!requested.devCode) {
    throw new Error(
      `Сервер не вернул код для ${phone}. Симуляция работает только вне production ` +
        '(NODE_ENV != production).',
    );
  }

  const verified = await api<{ accessToken: string; user: { role: string } }>(
    base,
    '/auth/otp/verify',
    { method: 'POST', body: { phone, code: requested.devCode } },
  );

  cache[cacheKey] = verified.accessToken;
  writeTokenCache(cache);

  console.log(`${phone}: вход выполнен (роль ${verified.user.role})`);
  return verified.accessToken;
}

/** Один раз пережидаем троттлинг: лимит окна — минута, ждать осмысленно. */
async function requestOtpWithRetry(base: string, phone: string): Promise<{ devCode?: string }> {
  try {
    return await api<{ devCode?: string }>(base, '/auth/otp/request', {
      method: 'POST',
      body: { phone },
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 429) {
      throw error;
    }

    const waitSec = error.retryAfterSec ?? 60;
    console.log(`  лимит запросов кода исчерпан, жду ${waitSec} с…`);
    await sleep((waitSec + 1) * 1000);

    return api<{ devCode?: string }>(base, '/auth/otp/request', {
      method: 'POST',
      body: { phone },
    });
  }
}

const TERMINAL_STATUSES = [
  'closed',
  'cancelled_by_client',
  'cancelled_by_driver',
  'cancelled_system',
];

/** Статусы, из которых клиент вправе отменить заказ (`§8.12`). */
const CANCELLABLE_STATUSES = [
  'created',
  'searching_driver',
  'driver_assigned',
  'driver_en_route',
  'driver_arrived',
];

/**
 * Освобождает клиента от прошлого заказа: правило «один активный заказ на клиента» (`§9`)
 * иначе не даст запустить симуляцию второй раз.
 */
async function cancelActiveOrders(args: Args, clientToken: string): Promise<void> {
  const history = await api<Array<{ order: { id: string; status: string } }>>(
    args.api,
    '/orders/history?limit=10',
    { token: clientToken },
  );

  const active = history.filter((item) => !TERMINAL_STATUSES.includes(item.order.status));
  if (active.length === 0) {
    return;
  }

  for (const { order } of active) {
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      console.log(
        `  ! заказ ${order.id} в статусе «${order.status}» — отменить нельзя, ` +
          'завершите поездку в приложении водителя',
      );
      continue;
    }

    await api(args.api, `/orders/${order.id}/cancel`, {
      method: 'POST',
      token: clientToken,
      body: { reason: 'перезапуск симуляции' },
    });
    console.log(`  отменён прошлый заказ ${order.id} (${order.status})`);
  }
}

async function prepareDriver(args: Args): Promise<string> {
  const token = await login(args.api, args.driverPhone);

  const profile = await api<{
    id: string;
    fullName: string;
    verificationStatus: string;
    onlineStatus: string;
    canGoOnline?: boolean;
  }>(args.api, '/driver/profile', { token });

  console.log(
    `  ${profile.fullName}: верификация ${profile.verificationStatus}, ${profile.onlineStatus}`,
  );

  if (profile.verificationStatus !== 'approved') {
    throw new Error(
      `Водитель не верифицирован (${profile.verificationStatus}) — заказы ему не предлагаются. ` +
        'Одобрите документы через админ-API или возьмите сид-водителя +79280000011.',
    );
  }

  if (!args.forceOnline) {
    console.log('  --no-online: статус и позиция не трогаются');
    return token;
  }

  if (profile.onlineStatus !== 'online') {
    await api(args.api, '/driver/status', {
      method: 'PATCH',
      token,
      body: { status: 'online' },
    });
    console.log('  выведен на линию');
  }

  // Позиция обязательна: подбор ищет водителей в Redis GEO в радиусе 10 км от подачи.
  await api(args.api, '/driver/location', {
    method: 'PATCH',
    token,
    body: { lat: args.pickup.lat, lng: args.pickup.lng },
  });
  console.log(`  позиция выставлена в точку подачи ${args.pickup.lat}, ${args.pickup.lng}`);

  return token;
}

async function createOrder(args: Args): Promise<{ orderId: string; clientToken: string }> {
  console.log('');
  const token = await login(args.api, args.clientPhone);

  await cancelActiveOrders(args, token);

  const estimate = await api<{
    price: { estimated: number; currency: string };
    route: { distanceM: number; durationS: number };
  }>(args.api, '/orders/estimate', {
    method: 'POST',
    token,
    body: { regionId: DEFAULTS.regionId, pickup: args.pickup, dropoff: args.dropoff },
  });

  console.log(
    `  предварительно: ${estimate.price.estimated} ${estimate.price.currency}, ` +
      `${(estimate.route.distanceM / 1000).toFixed(1)} км, ` +
      `${Math.round(estimate.route.durationS / 60)} мин`,
  );

  const order = await api<{ id: string; status: string }>(args.api, '/orders', {
    method: 'POST',
    token,
    body: {
      regionId: DEFAULTS.regionId,
      pickup: args.pickup,
      dropoff: args.dropoff,
      paymentMethod: args.payment,
      comment: args.comment,
    },
  });

  console.log(`  заказ создан: ${order.id} (${order.status})`);
  return { orderId: order.id, clientToken: token };
}

/** Слежение за статусами: видно, как водитель ведёт поездку в приложении. */
async function watchOrder(args: Args, orderId: string, clientToken: string): Promise<void> {
  const POLL_MS = 2000;
  const TIMEOUT_MS = 10 * 60 * 1000;

  console.log('\nСлежу за заказом (Ctrl+C — выход)…');
  const startedAt = Date.now();
  let previous = '';

  while (Date.now() - startedAt < TIMEOUT_MS) {
    const order = await api<{ status: string; driver?: { fullName: string } | null }>(
      args.api,
      `/orders/${orderId}`,
      { token: clientToken },
    );

    if (order.status !== previous) {
      const driver = order.driver ? ` · ${order.driver.fullName}` : '';
      console.log(`  ${new Date().toLocaleTimeString('ru-RU')}  ${order.status}${driver}`);
      previous = order.status;
    }

    if (TERMINAL_STATUSES.includes(order.status)) {
      console.log('\nЗаказ завершён.\n');
      return;
    }

    await sleep(POLL_MS);
  }

  console.log('\nТайм-аут слежения (10 минут).\n');
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log(`API: ${args.api}`);

  if (args.reset) {
    const clientToken = await login(args.api, args.clientPhone);
    await cancelActiveOrders(args, clientToken);
    console.log('\nЗаказы клиента очищены.\n');
    return;
  }

  await prepareDriver(args);
  const { orderId, clientToken } = await createOrder(args);

  console.log('\nГотово. На телефоне водителя должна появиться карточка «Новый заказ».');
  console.log('Предложение живёт 30 секунд — если не успеть, запустите скрипт заново.\n');

  if (args.watch) {
    await watchOrder(args, orderId, clientToken);
  }
}

if (process.argv.includes('--help')) {
  console.log(USAGE);
  process.exit(0);
}

run().catch((error: unknown) => {
  if (error instanceof ApiError || error instanceof Error) {
    console.error(`\nСимуляция не удалась: ${error.message}\n`);
    process.exit(1);
  }
  console.error('\nСимуляция не удалась:', error, '\n');
  process.exit(1);
});
