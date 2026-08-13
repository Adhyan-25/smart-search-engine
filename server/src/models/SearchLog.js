const mongoose = require('mongoose');

const searchLogSchema = new mongoose.Schema(
  {
    query: { type: String, required: true, index: true },
    resultCount: { type: Number, required: true },
    responseTimeMs: { type: Number, required: true },
    cacheHit: { type: Boolean, default: false },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    instanceId: { type: String },
  },
  { timestamps: true }
);

searchLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SearchLog', searchLogSchema);
