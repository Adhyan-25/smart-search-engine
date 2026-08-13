/**
 * Local (process-in-memory) Token Bucket rate limiter.
 *
 * Bucket holds up to `capacity` tokens. Tokens refill continuously at
 * `refillRatePerSec`. Each request consumes 1 token (or `cost` tokens).
 * If insufficient tokens, the request is rejected.
 *
 * LIMITATION (intentional, for the demo): this state lives in process
 * memory. With multiple Node instances behind a load balancer, each
 * instance has its OWN bucket per key, so a client could get far more
 * than the intended global rate by being routed to different instances.
 * See RedisTokenBucket for the distributed fix.
 */
class TokenBucket {
  constructor(capacity = 10, refillRatePerSec = 1) {
    this.capacity = capacity;
    this.refillRatePerSec = refillRatePerSec;
    this.buckets = new Map(); // key -> { tokens, lastRefillMs }
  }

  _refill(bucket, nowMs) {
    const elapsedSec = (nowMs - bucket.lastRefillMs) / 1000;
    if (elapsedSec <= 0) return;
    const refillAmount = elapsedSec * this.refillRatePerSec;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + refillAmount);
    bucket.lastRefillMs = nowMs;
  }

  /** Returns { allowed, remaining, retryAfterMs } */
  tryConsume(key, cost = 1) {
    const nowMs = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefillMs: nowMs };
      this.buckets.set(key, bucket);
    }
    this._refill(bucket, nowMs);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
    }

    const deficit = cost - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / this.refillRatePerSec) * 1000);
    return { allowed: false, remaining: Math.floor(bucket.tokens), retryAfterMs };
  }

  reset(key) {
    this.buckets.delete(key);
  }
}

module.exports = { TokenBucket };
