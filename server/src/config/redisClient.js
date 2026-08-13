const Redis = require('ioredis');
const { config } = require('./index');

let client = null;

/**
 * Lazily-created singleton Redis client. Retry strategy is capped so a dead
 * Redis doesn't cause unbounded reconnect storms; callers must handle Redis
 * being unavailable gracefully (see cacheService's degrade-on-error logic).
 */
function getRedisClient() {
  if (client) return client;
  client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying, treat as down
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
  });

  client.on('error', (err) => {
    // Intentionally does not crash the process - Redis being down should
    // degrade search/cache behavior, not take the whole API offline.
    console.error(`[redis] connection error: ${err.message}`);
  });

  return client;
}

module.exports = { getRedisClient };
