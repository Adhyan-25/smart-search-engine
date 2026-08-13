/**
 * Circuit breaker: CLOSED -> OPEN -> HALF_OPEN -> CLOSED.
 *
 * CLOSED: calls pass through normally; failures are counted in a rolling window.
 * OPEN: calls are rejected immediately (fail fast) without touching the
 *       dependency, for `resetTimeoutMs`. This is the whole point - it stops
 *       hammering an already-struggling dependency and stops making our own
 *       requests pile up waiting on a dependency that isn't going to answer.
 * HALF_OPEN: after the timeout, ONE trial call is allowed through. Success
 *       closes the circuit; failure re-opens it.
 */

const STATES = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;

    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.totalCalls = 0;
    this.rejectedCalls = 0; // calls short-circuited while OPEN
  }

  async call(fn) {
    this.totalCalls += 1;

    if (this.state === STATES.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < this.resetTimeoutMs) {
        this.rejectedCalls += 1;
        const err = new Error('Circuit breaker is OPEN - failing fast without calling dependency');
        err.circuitOpen = true;
        throw err;
      }
      this.state = STATES.HALF_OPEN;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.successCount += 1;
    if (this.state === STATES.HALF_OPEN) {
      this.state = STATES.CLOSED;
      this.failureCount = 0;
    } else if (this.state === STATES.CLOSED) {
      this.failureCount = 0;
    }
  }

  _onFailure() {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.state === STATES.HALF_OPEN) {
      this.state = STATES.OPEN;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = STATES.OPEN;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      rejectedCalls: this.rejectedCalls,
    };
  }

  reset() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.rejectedCalls = 0;
  }
}

module.exports = { CircuitBreaker, STATES };
