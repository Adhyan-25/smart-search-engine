const { LRUCache } = require('../algorithms/LRUCache');
const { BloomFilter } = require('../algorithms/BloomFilter');
const { getRedisClient } = require('../config/redisClient');
const { config } = require('../config');

// Process-local LRU: fastest, but not shared across Node instances.
const localLru = new LRUCache(config.cache.lruCapacity);

// Bloom filter over known search terms, used as a fast pre-check before
// hitting Mongo for autocomplete existence checks. Must be populated at
// startup from the seeded catalog (see scripts/seed.js / server.js).
const termsBloomFilter = new BloomFilter(
  config.bloomFilter.expectedItems,
  config.bloomFilter.falsePositiveRate
);

let redisHits = 0;
let redisMisses = 0;
let redisErrors = 0;

/**
 * Cache-aside read: LRU (in-process) -> Redis (shared) -> compute via fetchFn.
 * Populates both cache layers on a miss. If Redis is unreachable, we log and
 * fall through to fetchFn rather than failing the whole request - a cache
 * outage should degrade performance, not availability.
 */
async function getOrSetCached(key, fetchFn, ttlSeconds = config.cache.redisTtlSeconds) {
  const localHit = localLru.get(key);
  if (localHit?.expiresAt > Date.now()) {
    return { data: localHit.data, source: 'local-lru' };
  }

  const client = getRedisClient();
  try {
    const cached = await client.get(key);
    if (cached !== null) {
      redisHits += 1;
      const parsed = JSON.parse(cached);
      localLru.put(key, { data: parsed, expiresAt: Date.now() + ttlSeconds * 1000 });
      return { data: parsed, source: 'redis' };
    }
    redisMisses += 1;
  } catch (err) {
    redisErrors += 1;
    console.error(`[cache] Redis GET failed, degrading to direct compute: ${err.message}`);
  }

  const fresh = await fetchFn();

  localLru.put(key, { data: fresh, expiresAt: Date.now() + ttlSeconds * 1000 });
  try {
    await client.set(key, JSON.stringify(fresh), 'EX', ttlSeconds);
  } catch (err) {
    redisErrors += 1;
    console.error(`[cache] Redis SET failed (non-fatal): ${err.message}`);
  }

  return { data: fresh, source: 'miss' };
}

async function invalidate(key) {
  localLru.put(key, undefined);
  try {
    await getRedisClient().del(key);
  } catch (err) {
    console.error(`[cache] Redis DEL failed: ${err.message}`);
  }
}

function stats() {
  const total = redisHits + redisMisses;
  return {
    lru: localLru.stats(),
    redis: {
      hits: redisHits,
      misses: redisMisses,
      errors: redisErrors,
      hitRate: total === 0 ? 0 : redisHits / total,
    },
    bloomFilter: {
      insertedCount: termsBloomFilter.insertedCount,
      currentFalsePositiveRate: termsBloomFilter.currentFalsePositiveRate(),
      memoryBytes: termsBloomFilter.memoryBytes(),
    },
  };
}

module.exports = { getOrSetCached, invalidate, stats, localLru, termsBloomFilter };
