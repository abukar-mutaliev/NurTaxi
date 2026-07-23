import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { createE2eApp } from '../helpers/e2e-app';
import { authHeader, issueAccessToken } from '../helpers/test-auth';
import { INGUSHETIA_REGION_ID, SEED_IDS, SEED_USERS } from '../helpers/seed-refs';
import { shouldRunE2e } from '../helpers/run-e2e';

/**
 * RBAC и изоляция регионов (Req §20, §25).
 */
const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('Security RBAC (e2e)', () => {
  let app: INestApplication;
  let clientToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    app = await createE2eApp();

    const client = SEED_USERS.find((u) => u.id === SEED_IDS.users.client1)!;
    const superAdmin = SEED_USERS.find((u) => u.id === SEED_IDS.users.superAdmin)!;

    clientToken = await issueAccessToken(app, {
      id: client.id,
      role: Role.Client,
      phone: client.phone,
    });
    superAdminToken = await issueAccessToken(app, {
      id: superAdmin.id,
      role: Role.SuperAdmin,
      phone: superAdmin.phone,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('клиент не имеет доступа к admin API', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/admin/tariffs?regionId=${INGUSHETIA_REGION_ID}`)
      .set(authHeader(clientToken))
      .expect(403);
  });

  it('запрос без токена возвращает 401', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/admin/tariffs?regionId=${INGUSHETIA_REGION_ID}`)
      .expect(401);
  });

  it('super_admin имеет доступ к admin API', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/admin/tariffs?regionId=${INGUSHETIA_REGION_ID}`)
      .set(authHeader(superAdminToken))
      .expect(200);
  });
});
