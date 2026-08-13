const { checkDistributedRateLimit } = require('../services/rateLimiterService');
const { ApiError } = require('./errorHandler');

function rateLimitMiddleware() {
  return async (req, res, next) => {
    const key = req.ip || 'unknown';
    const result = await checkDistributedRateLimit(key);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    if (!result.allowed) {
      return next(new ApiError(429, 'Too many requests - rate limit exceeded'));
    }
    next();
  };
}

module.exports = { rateLimitMiddleware };
