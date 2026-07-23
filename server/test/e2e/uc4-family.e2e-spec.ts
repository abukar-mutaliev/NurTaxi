import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { PaymentMethod } from '../../src/common/enums/order-status.enum';
import { createE2eApp } from '../helpers/e2e-app';
import { authHeader, issueAccessToken } from '../helpers/test-auth';
import { INGUSHETIA_REGION_ID, SEED_IDS, SEED_USERS } from '../helpers/seed-refs';
import { shouldRunE2e } from '../helpers/run-e2e';

/**
 * UC-4. Заказ для члена семьи (Req §16, §8.6).
 */
const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('UC-4 Family order (e2e)', () => {
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

  it('видит подтверждённых членов семьи', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me/family')
      .set(authHeader(clientToken))
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].status).toBe('confirmed');
  });

  it('создаёт заказ для подтверждённого члена семьи', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(authHeader(clientToken))
      .send({
        regionId: INGUSHETIA_REGION_ID,
        familyMemberId: SEED_IDS.familyMembers.client1Client2,
        pickup: { lat: 43.21, lng: 44.76, address: 'Назрань, семейный заказ' },
        dropoff: { lat: 43.17, lng: 44.8, address: 'Магас, семейный заказ' },
        paymentMethod: PaymentMethod.Cash,
      })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.familyMemberId).toBe(SEED_IDS.familyMembers.client1Client2);
  });
});
