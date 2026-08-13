const request = require('supertest');
const { createApp } = require('../../src/app');

describe('Centralized error handling', () => {
  const app = createApp();

  test('unknown route returns standardized 404 body', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('statusCode', 404);
  });
});
