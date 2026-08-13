const { searchOffset, searchCursor } = require('../services/searchService');
const { recordSearch } = require('../services/autocompleteService');
const { enqueueAnalyticsJob } = require('../queues/analyticsQueue');
const { config } = require('../config');

async function search(req, res, next) {
  try {
    const params = req.validatedQuery;
    const startMs = Date.now();

    const result = params.after !== undefined
      ? await searchCursor(params)
      : await searchOffset({ ...params, page: params.page, limit: params.limit });

    const responseTimeMs = Date.now() - startMs;

    if (params.q) {
      recordSearch(params.q);
      enqueueAnalyticsJob({
        query: params.q,
        resultCount: result.results.length,
        responseTimeMs,
        instanceId: config.instanceId,
      });
    }

    res.json({
      query: params.q || '',
      ...result,
      _meta: { responseTimeMs, instanceId: config.instanceId },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { search };
