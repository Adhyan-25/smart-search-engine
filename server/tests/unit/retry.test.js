const { retryWithBackoff } = require('../../src/utils/retry');

describe('retryWithBackoff', () => {
  test('returns result on first success, no retries', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries transient failures then succeeds', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls += 1;
      if (calls < 3) return Promise.reject(new Error('transient'));
      return Promise.resolve('recovered');
    });
    const result = await retryWithBackoff(fn, { maxRetries: 5, baseDelayMs: 1 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('throws after exhausting maxRetries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));
    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 1 })
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  test('does not retry when isRetryable returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('non-transient'));
    await expect(
      retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 1, isRetryable: () => false })
    ).rejects.toThrow('non-transient');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
