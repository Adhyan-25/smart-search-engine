const request = require('supertest');
const { createApp } = require('../../src/app');
const { getRedisClient } = require('../../src/config/redisClient');

describe('Rate limiting middleware (against real local Redis)', () => {
  const app = createApp();

  afterAll(async () => {
    await getRedisClient().quit();
  });

  test('returns 429 after exceeding capacity from the same IP', async () => {
    const agent = request(app);
    let sawRateLimited = false;
    // config default capacity is 20; fire more than that from the "same" test client
    for (let i = 0; i < 30; i++) {
      const res = await agent.get('/api/v1/autocomplete').query({ q: 'i' });
      if (res.status === 429) {
        sawRateLimited = true;
        expect(res.body.error.statusCode).toBe(429);
        break;
      }
    }
    expect(sawRateLimited).toBe(true);
  });
});
