import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Нагрузочный smoke-тест KPI (Req §10.1, §25).
 * Запуск: k6 run infra/load/k6-smoke.js
 * Переменные: BASE_URL (default http://localhost:3000)
 */
export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:3000';

export default function () {
  const live = http.get(`${BASE_URL}/api/v1/health/live`);
  check(live, { 'live 200': (r) => r.status === 200 });

  const ready = http.get(`${BASE_URL}/api/v1/health/ready`);
  check(ready, { 'ready 200': (r) => r.status === 200 });

  const root = http.get(`${BASE_URL}/api/v1`);
  check(root, { 'api 200': (r) => r.status === 200 });

  sleep(0.3);
}
