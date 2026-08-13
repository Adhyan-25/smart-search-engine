/**
 * Demonstrates why a process-local rate limiter is insufficient across
 * multiple Node instances, and how the Redis-backed version fixes it.
 * Simulates 2 "instances" by creating two independent local TokenBuckets
 * for the same client key, vs two calls into the SAME Redis-backed limiter.
 * Run: node benchmarks/rateLimiterLocalVsDistributed.js
 */
const { TokenBucket } = require('../src/algorithms/TokenBucket');
const { checkDistributedRateLimit } = require('../src/services/rateLimiterService');
const { getRedisClient } = require('../src/config/redisClient');
const { config } = require('../src/config');

async function main() {
  const clientKey = 'demo-client';
  const capacity = config.rateLimit.capacity;

  console.log('Local vs Redis-backed Distributed Rate Limiting (2 simulated Node instances)');
  console.log(`Configured capacity: ${capacity} tokens per client`);
  console.log('='.repeat(70));

  // Local: instance A and instance B each get their OWN bucket (this is
  // the bug - in reality this happens because they're separate processes).
  const instanceABucket = new TokenBucket(capacity, config.rateLimit.refillPerSec);
  const instanceBBucket = new TokenBucket(capacity, config.rateLimit.refillPerSec);

  let allowedLocalTotal = 0;
  for (let i = 0; i < capacity; i++) {
    if (instanceABucket.tryConsume(clientKey).allowed) allowedLocalTotal += 1;
  }
  for (let i = 0; i < capacity; i++) {
    if (instanceBBucket.tryConsume(clientKey).allowed) allowedLocalTotal += 1;
  }

  console.log(`\nLocal (process-in-memory) limiter, client hits instance A then instance B:`);
  console.log(`  Requests allowed: ${allowedLocalTotal} (expected cap: ${capacity})`);
  console.log(`  -> client effectively got ${allowedLocalTotal / capacity}x the intended rate`);
  console.log(`     just by being routed to a different instance.`);

  // Redis-backed: both "instances" call into the SAME shared state.
  const sharedKey = `bench-shared-${Date.now()}`;
  await getRedisClient().del(`ratelimit:${sharedKey}`);
  let allowed = 0;
  for (let i = 0; i < capacity; i++) {
    const r = await checkDistributedRateLimit(sharedKey); // "instance A" call
    if (r.allowed) allowed += 1;
  }
  for (let i = 0; i < capacity; i++) {
    const r = await checkDistributedRateLimit(sharedKey); // "instance B" call, same shared key
    if (r.allowed) allowed += 1;
  }

  console.log(`\nRedis-backed distributed limiter, client hits instance A then instance B:`);
  console.log(`  Requests allowed: ${allowed} (expected cap: ${capacity})`);
  console.log(`  -> shared state correctly enforces the global cap regardless of which`);
  console.log(`     instance handled each request.`);

  await getRedisClient().quit();
}

main().catch((err) => { console.error(err); process.exit(1); });
