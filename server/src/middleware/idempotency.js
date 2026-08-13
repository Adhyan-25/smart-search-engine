const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');
const { ApiError } = require('./errorHandler');

/**
 * Idempotency-Key middleware for POST endpoints (section 25). If the same
 * key is replayed (e.g. a client retrying after a timeout), we return the
 * ORIGINAL response instead of re-running the side effect.
 */
function idempotencyMiddleware() {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) {
      return next(new ApiError(400, 'Idempotency-Key header is required for this operation'));
    }

    const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');

    const existing = await IdempotencyKey.findOne({ key });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return next(new ApiError(422, 'Idempotency-Key reused with a different request body'));
      }
      return res.status(existing.responseStatus).json({ ...existing.responseBody, idempotentReplay: true });
    }

    // Stash a way for the controller to persist its result after handling.
    req.saveIdempotentResult = async (statusCode, body) => {
      try {
        await IdempotencyKey.create({ key, requestHash, responseStatus: statusCode, responseBody: body });
      } catch (err) {
        if (err.code !== 11000) throw err; // ignore duplicate-key race, harmless
      }
    };
    next();
  };
}

module.exports = { idempotencyMiddleware };
