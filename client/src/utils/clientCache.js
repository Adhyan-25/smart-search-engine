/**
 * Basic client-side cache for repeated autocomplete/search queries
 * (section 11). A plain Map, deliberately simple - this is the "before"
 * state that motivates the custom LRUCache on the server side.
 */
const cache = new Map();
const TTL_MS = 30_000;
let hits = 0;
let misses = 0;

export function getCached(key) {
  const entry = cache.get(key);
  if (entry && Number.isFinite(entry.expiresAt) && entry.expiresAt > Date.now()) {
    hits += 1;
    return entry.value;
  }
  cache.delete(key);
  misses += 1;
  return undefined;
}

export function setCached(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function clientCacheStats() {
  const total = hits + misses;
  return {
    hits,
    misses,
    hitRate: total === 0 ? 0 : hits / total,
    requestsAvoided: hits,
  };
}
