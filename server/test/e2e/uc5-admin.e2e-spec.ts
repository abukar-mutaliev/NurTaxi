import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { createE2eApp } from '../helpers/e2e-app';
import { authHeader, issueAccessToken } from '../helpers/test-auth';
import { INGUSHETIA_REGION_ID, SEED_IDS, SEED_USERS } from '../helpers/seed-refs';
import { shouldRunE2e } from '../helpers/run-e2e';

/**
 * UC-5. Управление регионом админом (Req §16, §7).
 */
const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('UC-5 Admin region (e2e)', () => {
  let app: INestApplication;
  let superAdminToken: string;
  let regionalAdminToken: string;

  beforeAll(async () => {
    app = await createE2eApp();

    const superAdmin = SEED_USERS.find((u) => u.id === SEED_IDS.users.superAdmin)!;
    const regionalAdmin = SEED_USERS.find((u) => u.id === SEED_IDS.users.regionalAdmin)!;

    superAdminToken = await issueAccessToken(app, {
      id: superAdmin.id,
      role: Role.SuperAdmin,
      phone: superAdmin.phone,
    });
    regionalAdminToken = await issueAccessToken(app, {
      id: regionalAdmin.id,
      role: Role.RegionalAdmin,
      phone: regionalAdmin.phone,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('super_admin получает список тарифов региона', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/tariffs?regionId=${INGUSHETIA_REGION_ID}`)
      .set(authHeader(superAdminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('regional_admin не может читать чужой регион', async () => {
    const foreignRegionId = '00000000-0000-4000-8000-000000009999';
    await request(app.getHttpServer())
      .get(`/api/v1/admin/tariffs?regionId=${foreignRegionId}`)
      .set(authHeader(regionalAdminToken))
      .expect(403);
  });
});
