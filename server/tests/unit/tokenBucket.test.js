const { TokenBucket } = require('../../src/algorithms/TokenBucket');

describe('TokenBucket', () => {
  test('allows requests up to capacity', () => {
    const bucket = new TokenBucket(3, 1);
    expect(bucket.tryConsume('user1').allowed).toBe(true);
    expect(bucket.tryConsume('user1').allowed).toBe(true);
    expect(bucket.tryConsume('user1').allowed).toBe(true);
    expect(bucket.tryConsume('user1').allowed).toBe(false);
  });

  test('different keys have independent buckets', () => {
    const bucket = new TokenBucket(1, 1);
    expect(bucket.tryConsume('user1').allowed).toBe(true);
    expect(bucket.tryConsume('user2').allowed).toBe(true);
  });

  test('refills over time', async () => {
    const bucket = new TokenBucket(1, 10); // 10 tokens/sec refill
    expect(bucket.tryConsume('user1').allowed).toBe(true);
    expect(bucket.tryConsume('user1').allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 150)); // ~1.5 tokens should refill
    expect(bucket.tryConsume('user1').allowed).toBe(true);
  });

  test('rejection includes retryAfterMs', () => {
    const bucket = new TokenBucket(1, 1);
    bucket.tryConsume('u');
    const result = bucket.tryConsume('u');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });
});
