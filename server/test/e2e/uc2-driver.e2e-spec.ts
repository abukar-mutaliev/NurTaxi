import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { createE2eApp } from '../helpers/e2e-app';
import { authHeader, issueAccessToken } from '../helpers/test-auth';
import { INGUSHETIA_REGION_ID, SEED_IDS, SEED_USERS } from '../helpers/seed-refs';
import { shouldRunE2e } from '../helpers/run-e2e';

/**
 * UC-2. Регистрация и верификация водителя — профиль и статус (Req §16).
 */
const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('UC-2 Driver verification (e2e)', () => {
  let app: INestApplication;
  let driverToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    const driver = SEED_USERS.find((u) => u.id === SEED_IDS.users.driver1)!;
    driverToken = await issueAccessToken(app, {
      id: driver.id,
      role: Role.Driver,
      phone: driver.phone,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('водитель видит свой профиль и статус верификации', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/driver/profile')
      .set(authHeader(driverToken))
      .expect(200);

    expect(res.body.verificationStatus).toBe('approved');
    expect(res.body.regionId).toBe(INGUSHETIA_REGION_ID);
  });
});
