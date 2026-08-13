/**
 * Reusable retry-with-exponential-backoff-and-jitter wrapper.
 *
 * Only retries errors the caller marks as transient (via isRetryable), so
 * we don't blindly retry things like validation errors or 4xx responses
 * that will never succeed on retry.
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 100,
    maxDelayMs = 2000,
    isRetryable = () => true,
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isRetryable(err)) {
        throw err;
      }
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.random() * exponential * 0.5;
      const delay = exponential / 2 + jitter; // full-jitter-ish
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
  throw lastError;
}

module.exports = { retryWithBackoff };
