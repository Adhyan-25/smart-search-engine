const mongoose = require('mongoose');

// Stores the result of a POST operation keyed by client-supplied
// Idempotency-Key, so a retried request returns the original result instead
// of repeating the side effect.
const idempotencyKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    requestHash: { type: String, required: true },
    responseStatus: { type: Number, required: true },
    responseBody: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// TTL: idempotency records expire after 24h so the collection doesn't grow forever.
idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
