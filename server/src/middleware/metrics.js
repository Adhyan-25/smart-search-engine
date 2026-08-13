/**
 * In-process metrics collection (section 20). For a real multi-instance
 * deployment this would be scraped per-instance by Prometheus; here it's
 * exposed directly via /api/v1/metrics for the demo/analytics page.
 */
const latencies = { search: [], autocomplete: [] };
const MAX_SAMPLES = 2000; // ring-buffer-ish cap so this can't grow unbounded

let requestCount = 0;
let errorCount = 0;
const startTime = Date.now();

function recordLatency(bucket, ms) {
  if (!latencies[bucket]) latencies[bucket] = [];
  latencies[bucket].push(ms);
  if (latencies[bucket].length > MAX_SAMPLES) latencies[bucket].shift();
}

function metricsMiddleware(req, res, next) {
  requestCount += 1;
  res.on('finish', () => {
    if (res.statusCode >= 500) errorCount += 1;
    if (req.originalUrl.includes('/search')) recordLatency('search', req.responseTimeMs || 0);
    if (req.originalUrl.includes('/autocomplete')) recordLatency('autocomplete', req.responseTimeMs || 0);
  });
  next();
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return +sorted[idx].toFixed(2);
}

function getMetricsSnapshot() {
  const uptimeSec = (Date.now() - startTime) / 1000;
  return {
    uptimeSec: +uptimeSec.toFixed(1),
    requestCount,
    errorCount,
    errorRate: requestCount === 0 ? 0 : +(errorCount / requestCount).toFixed(4),
    requestsPerSecond: uptimeSec > 0 ? +(requestCount / uptimeSec).toFixed(2) : 0,
    latency: {
      search: {
        p50: percentile(latencies.search, 50),
        p95: percentile(latencies.search, 95),
        p99: percentile(latencies.search, 99),
        samples: latencies.search.length,
      },
      autocomplete: {
        p50: percentile(latencies.autocomplete, 50),
        p95: percentile(latencies.autocomplete, 95),
        p99: percentile(latencies.autocomplete, 99),
        samples: latencies.autocomplete.length,
      },
    },
  };
}

module.exports = { metricsMiddleware, getMetricsSnapshot };
