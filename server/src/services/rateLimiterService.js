const { TokenBucket } = require('../algorithms/TokenBucket');
const { getRedisClient } = require('../config/redisClient');
const { config } = require('../config');

// Local, process-in-memory limiter (see TokenBucket.js docstring for why this
// is insufficient once you have >1 Node instance behind a load balancer).
const localBucket = new TokenBucket(config.rateLimit.capacity, config.rateLimit.refillPerSec);

let rejectedCount = 0;

function checkLocalRateLimit(key) {
  const result = localBucket.tryConsume(key);
  if (!result.allowed) rejectedCount += 1;
  return result;
}

/**
 * Redis-backed distributed token bucket. State lives in Redis, shared by
 * every Node instance, so a client's rate limit is enforced globally
 * regardless of which instance handles the request.
 *
 * Implemented with a Lua script so the read-refill-consume-write sequence
 * is atomic - without this, two instances could race and both allow a
 * request that should have been rejected.
 */
const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillPerSec = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefillMs')
local tokens = tonumber(bucket[1])
local lastRefillMs = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefillMs = now
end

local elapsedSec = (now - lastRefillMs) / 1000
if elapsedSec > 0 then
  tokens = math.min(capacity, tokens + elapsedSec * refillPerSec)
end

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'lastRefillMs', now)
redis.call('EXPIRE', key, 3600)

return {allowed, tokens}
`;

async function checkDistributedRateLimit(key, cost = 1) {
  const client = getRedisClient();
  const redisKey = `ratelimit:${key}`;
  try {
    const [allowed, remaining] = await client.eval(
      TOKEN_BUCKET_LUA,
      1,
      redisKey,
      config.rateLimit.capacity,
      config.rateLimit.refillPerSec,
      Date.now(),
      cost
    );
    if (allowed === 0) rejectedCount += 1;
    return { allowed: allowed === 1, remaining: Math.floor(remaining) };
  } catch (err) {
    // Fail open: if Redis is down, don't block all traffic because of it.
    console.error(`[rateLimiter] Redis unavailable, failing open: ${err.message}`);
    return { allowed: true, remaining: -1, degraded: true };
  }
}

function getStats() {
  return { rejectedCount };
}

module.exports = { checkLocalRateLimit, checkDistributedRateLimit, getStats };
