const { CircuitBreaker, STATES } = require('../../src/utils/CircuitBreaker');

function failingFn() {
  return Promise.reject(new Error('dependency down'));
}
function okFn() {
  return Promise.resolve('ok');
}

describe('CircuitBreaker', () => {
  test('opens after failureThreshold consecutive failures', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failingFn)).rejects.toThrow('dependency down');
    }
    expect(cb.getState().state).toBe(STATES.OPEN);
  });

  test('fails fast without calling dependency while OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5000 });
    await expect(cb.call(failingFn)).rejects.toThrow();
    expect(cb.getState().state).toBe(STATES.OPEN);

    let called = false;
    const trackedFn = () => { called = true; return Promise.resolve('x'); };
    await expect(cb.call(trackedFn)).rejects.toThrow('Circuit breaker is OPEN');
    expect(called).toBe(false);
  });

  test('transitions to HALF_OPEN then CLOSED after a successful trial call', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
    await expect(cb.call(failingFn)).rejects.toThrow();
    expect(cb.getState().state).toBe(STATES.OPEN);

    await new Promise((r) => setTimeout(r, 60));
    const result = await cb.call(okFn);
    expect(result).toBe('ok');
    expect(cb.getState().state).toBe(STATES.CLOSED);
  });

  test('re-opens if the HALF_OPEN trial call fails', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
    await expect(cb.call(failingFn)).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 60));
    await expect(cb.call(failingFn)).rejects.toThrow();
    expect(cb.getState().state).toBe(STATES.OPEN);
  });
});
