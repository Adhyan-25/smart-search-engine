const request = require('supertest');
const { createApp } = require('../../src/app');

describe('GET /api/v1/health', () => {
  const app = createApp();

  test('returns dependency status (degraded is expected without a live Mongo connection in this environment)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('dependencies.redis');
    expect(res.body).toHaveProperty('dependencies.mongodb');
    expect(res.body).toHaveProperty('instanceId');
  });

  test('response includes X-Instance-Id header', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-instance-id']).toBeDefined();
  });
});
