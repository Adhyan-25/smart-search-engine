/**
 * Regression test for a real bug found during frontend work: searchOffset
 * used to return the cache wrapper's raw { data, source } shape instead of
 * unwrapping it, so `result.results` was undefined and the search endpoint
 * would have thrown at `result.results.length`. Mongo isn't available in
 * this sandbox, so Product.find/countDocuments are mocked - this test only
 * verifies the response SHAPE contract, not real query correctness (that
 * still needs a live Mongo run, see docs/IMPLEMENTATION_STATUS.md).
 */
jest.mock('../../src/models/Product', () => {
  const mockDocs = [
    { _id: '1', title: 'iphone case', category: 'Electronics', price: 20, rating: 4, popularity: 10, keywords: [], toObject() { return this; } },
  ];
  const chainable = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(mockDocs),
  };
  return {
    find: jest.fn(() => chainable),
    countDocuments: jest.fn().mockResolvedValue(1),
  };
});

const { searchOffset } = require('../../src/services/searchService');
const { getRedisClient } = require('../../src/config/redisClient');

describe('searchService.searchOffset response shape', () => {
  afterAll(async () => {
    await getRedisClient().quit();
  });

  test('returns flat { results, pagination, cacheSource }, not the raw cache wrapper', async () => {
    const result = await searchOffset({ q: 'iphone', page: 1, limit: 20 });
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(1); // this line alone would have thrown pre-fix
    expect(result.pagination).toHaveProperty('totalResults');
    expect(['local-lru', 'redis', 'miss']).toContain(result.cacheSource);
  });
});
