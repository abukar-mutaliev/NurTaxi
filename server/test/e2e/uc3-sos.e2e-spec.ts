import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { createE2eApp } from '../helpers/e2e-app';
import { authHeader, issueAccessToken } from '../helpers/test-auth';
import { SEED_IDS, SEED_USERS } from '../helpers/seed-refs';
import { shouldRunE2e } from '../helpers/run-e2e';

/**
 * UC-3. Активация SOS (Req §16, §8.7).
 */
const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('UC-3 SOS (e2e)', () => {
  let app: INestApplication;
  let clientToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    const client = SEED_USERS.find((u) => u.id === SEED_IDS.users.client1)!;
    clientToken = await issueAccessToken(app, {
      id: client.id,
      role: Role.Client,
      phone: client.phone,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('активирует SOS на активном заказе', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${SEED_IDS.orders.active}/sos`)
      .set(authHeader(clientToken))
      .send({ lat: 43.2167, lng: 44.7667 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.sosEventId).toBeTruthy();
    expect(res.body.contactsNotified).toBeGreaterThanOrEqual(0);
  });
});
