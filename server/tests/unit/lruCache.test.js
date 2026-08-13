const { LRUCache } = require('../../src/algorithms/LRUCache');

describe('LRUCache', () => {
  test('basic get/put', () => {
    const cache = new LRUCache(2);
    cache.put('a', 1);
    cache.put('b', 2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  test('evicts least recently used on overflow', () => {
    const cache = new LRUCache(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.get('a'); // a is now most recently used
    cache.put('c', 3); // should evict b
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  test('put on existing key updates value and recency', () => {
    const cache = new LRUCache(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('a', 100); // a is now most recently used
    cache.put('c', 3); // should evict b, not a
    expect(cache.get('a')).toBe(100);
    expect(cache.get('b')).toBeUndefined();
  });

  test('tracks hit/miss stats', () => {
    const cache = new LRUCache(5);
    cache.put('a', 1);
    cache.get('a'); // hit
    cache.get('z'); // miss
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  test('throws on invalid capacity', () => {
    expect(() => new LRUCache(0)).toThrow();
  });

  test('size never exceeds capacity', () => {
    const cache = new LRUCache(3);
    for (let i = 0; i < 10; i++) cache.put(`k${i}`, i);
    expect(cache.size).toBe(3);
  });
});
