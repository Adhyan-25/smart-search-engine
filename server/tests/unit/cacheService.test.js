const { getOrSetCached, stats } = require('../../src/services/cacheService');
const { getRedisClient } = require('../../src/config/redisClient');

describe('cacheService.getOrSetCached (against real local Redis)', () => {
  afterAll(async () => {
    await getRedisClient().quit();
  });

  test('first call is a miss and computes fresh; second call hits local LRU', async () => {
    const key = `cache-test-${Date.now()}`;
    let computeCalls = 0;
    const fetchFn = async () => {
      computeCalls += 1;
      return { value: 42 };
    };

    const first = await getOrSetCached(key, fetchFn, 30);
    expect(first.source).toBe('miss');
    expect(first.data).toEqual({ value: 42 });

    const second = await getOrSetCached(key, fetchFn, 30);
    expect(second.source).toBe('local-lru');
    expect(computeCalls).toBe(1); // fetchFn should not be called again
  });

  test('exposes hit-rate stats', async () => {
    const s = stats();
    expect(s.lru).toHaveProperty('hitRate');
    expect(s.redis).toHaveProperty('hitRate');
    expect(s.bloomFilter).toHaveProperty('currentFalsePositiveRate');
  });
});
