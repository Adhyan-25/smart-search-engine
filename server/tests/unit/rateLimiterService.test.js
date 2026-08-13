const { checkDistributedRateLimit } = require('../../src/services/rateLimiterService');
const { getRedisClient } = require('../../src/config/redisClient');

describe('checkDistributedRateLimit (against real local Redis)', () => {
  afterAll(async () => {
    const client = getRedisClient();
    await client.quit();
  });

  test('allows requests up to capacity then rejects', async () => {
    const key = `test-user-${Date.now()}`;
    const client = getRedisClient();
    await client.del(`ratelimit:${key}`);

    const results = [];
    for (let i = 0; i < 25; i++) {
      results.push(await checkDistributedRateLimit(key));
    }
    const allowedCount = results.filter((r) => r.allowed).length;
    // capacity is config.rateLimit.capacity (20 by default)
    expect(allowedCount).toBeLessThanOrEqual(20);
    expect(results.some((r) => r.allowed === false)).toBe(true);
  });

  test('state is shared across independent calls (simulating multiple instances)', async () => {
    const key = `shared-user-${Date.now()}`;
    const client = getRedisClient();
    await client.del(`ratelimit:${key}`);

    // Simulate instance A consuming most of the bucket
    for (let i = 0; i < 18; i++) await checkDistributedRateLimit(key);
    // Simulate instance B (separate call) seeing the SAME shared state
    const resultFromInstanceB = await checkDistributedRateLimit(key);
    expect(resultFromInstanceB.remaining).toBeLessThan(20);
  });
});
