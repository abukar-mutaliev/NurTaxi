import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { createE2eApp } from '../helpers/e2e-app';
import { authHeader, issueAccessToken } from '../helpers/test-auth';
import { INGUSHETIA_REGION_ID, SEED_IDS, SEED_USERS } from '../helpers/seed-refs';
import { shouldRunE2e } from '../helpers/run-e2e';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('Security compliance access (e2e, FZ-08.19)', () => {
  let app: INestApplication;
  let operatorToken: string;
  let regulatorToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    const operator = SEED_USERS.find((u) => u.id === SEED_IDS.users.operator)!;
    const regulator = SEED_USERS.find((u) => u.id === SEED_IDS.users.regulator)!;
    operatorToken = await issueAccessToken(app, {
      id: operator.id,
      role: Role.Operator,
      phone: operator.phone,
    });
    regulatorToken = await issueAccessToken(app, {
      id: regulator.id,
      role: Role.Regulator,
      phone: regulator.phone,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('оператор не читает чужой регион', async () => {
    const otherRegion = '00000000-0000-4000-8000-ffffffffffff';
    await request(app.getHttpServer())
      .get(`/api/v1/admin/orders?regionId=${otherRegion}`)
      .set(authHeader(operatorToken))
      .expect(403);
  });

  it('регулятор читает заказы, но не меняет статус', async () => {
    const list = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders?regionId=${INGUSHETIA_REGION_ID}`)
      .set(authHeader(regulatorToken))
      .expect(200);
    expect(Array.isArray(list.body.items) || Array.isArray(list.body)).toBe(true);

    const first = list.body.items?.[0] ?? list.body[0];
    if (first?.id) {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${first.id}/status`)
        .set(authHeader(regulatorToken))
        .send({ status: 'completed' })
        .expect(403);
    }
  });

  it('чтение заказа фиксируется в журнале аудита', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/admin/orders?regionId=${INGUSHETIA_REGION_ID}`)
      .set(authHeader(regulatorToken))
      .expect(200);

    const logs = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs?limit=20')
      .set(authHeader(regulatorToken))
      .expect(200);
    const items = logs.body.items ?? logs.body;
    expect(
      items.some(
        (row: { action?: string }) =>
          String(row.action).includes('GET') && String(row.action).includes('orders'),
      ),
    ).toBe(true);
  });
});
