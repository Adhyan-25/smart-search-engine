const { getMetricsSnapshot } = require('../middleware/metrics');
const cacheService = require('../services/cacheService');
const { getStats: getRateLimitStats } = require('../services/rateLimiterService');
const SearchLog = require('../models/SearchLog');

async function metrics(req, res, next) {
  try {
    res.json({
      ...getMetricsSnapshot(),
      cache: cacheService.stats(),
      rateLimit: getRateLimitStats(),
    });
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    const [topQueries, zeroResultQueries, avgResponseTime, totalSearches] = await Promise.all([
      SearchLog.aggregate([
        { $group: { _id: '$query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SearchLog.countDocuments({ resultCount: 0 }),
      SearchLog.aggregate([{ $group: { _id: null, avg: { $avg: '$responseTimeMs' } } }]),
      SearchLog.countDocuments({}),
    ]);

    res.json({
      totalSearches,
      zeroResultQueries,
      averageResponseTimeMs: avgResponseTime[0]?.avg ? +avgResponseTime[0].avg.toFixed(2) : 0,
      topQueries: topQueries.map((q) => ({ query: q._id, count: q.count })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { metrics, analytics };
