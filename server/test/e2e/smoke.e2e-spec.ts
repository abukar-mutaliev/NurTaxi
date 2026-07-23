import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from '../helpers/e2e-app';
import { shouldRunE2e } from '../helpers/run-e2e';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('Smoke (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1 — сервис отвечает', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/health/live — liveness', async () => {
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
  });

  it('GET /api/v1/health/ready — readiness', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /metrics — Prometheus', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text).toContain('http_request_duration_seconds');
  });
});
