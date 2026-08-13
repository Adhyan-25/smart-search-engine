import { useEffect, useState } from 'react';
import { fetchMetrics, fetchAnalytics } from '../services/api';
import { clientCacheStats } from '../utils/clientCache';

function Tile({ label, value }) {
  return (
    <div className="metric-tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = () => {
      Promise.all([fetchMetrics(), fetchAnalytics()])
        .then(([m, a]) => { setMetrics(m); setAnalytics(a); setError(null); })
        .catch((e) => setError(e.message));
    };
    load();
    const interval = setInterval(load, 5000); // poll every 5s for a live-ish dashboard
    return () => clearInterval(interval);
  }, []);

  const clientCache = clientCacheStats();

  if (error) return <div className="panel"><div className="state-message">Engineering metrics unavailable: {error}</div></div>;
  if (!metrics) return <div className="panel"><div className="state-message">Loading metrics...</div></div>;

  return (
    <div>
      <div className="panel">
        <p className="panel-title">System overview</p>
        <div className="metrics-grid">
          <Tile label="Requests" value={metrics.requestCount} />
          <Tile label="Req/sec" value={metrics.requestsPerSecond} />
          <Tile label="Error rate" value={`${(metrics.errorRate * 100).toFixed(2)}%`} />
          <Tile label="Uptime" value={`${metrics.uptimeSec}s`} />
        </div>
      </div>

      <div className="panel">
        <p className="panel-title">Latency (ms)</p>
        <table className="data-table">
          <thead><tr><th>Endpoint</th><th>P50</th><th>P95</th><th>P99</th><th>Samples</th></tr></thead>
          <tbody>
            <tr>
              <td>search</td><td>{metrics.latency.search.p50}</td><td>{metrics.latency.search.p95}</td>
              <td>{metrics.latency.search.p99}</td><td>{metrics.latency.search.samples}</td>
            </tr>
            <tr>
              <td>autocomplete</td><td>{metrics.latency.autocomplete.p50}</td><td>{metrics.latency.autocomplete.p95}</td>
              <td>{metrics.latency.autocomplete.p99}</td><td>{metrics.latency.autocomplete.samples}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <p className="panel-title">Cache & rate limiting</p>
        <div className="metrics-grid">
          <Tile label="Server LRU hit rate" value={`${(metrics.cache.lru.hitRate * 100).toFixed(1)}%`} />
          <Tile label="Redis cache hit rate" value={`${(metrics.cache.redis.hitRate * 100).toFixed(1)}%`} />
          <Tile label="Client cache hit rate" value={`${(clientCache.hitRate * 100).toFixed(1)}%`} />
          <Tile label="Bloom filter FP rate" value={`${(metrics.cache.bloomFilter.currentFalsePositiveRate * 100).toFixed(2)}%`} />
          <Tile label="Rate-limit rejections" value={metrics.rateLimit.rejectedCount} />
          <Tile label="Client requests avoided" value={clientCache.requestsAvoided} />
        </div>
      </div>

      <div className="panel">
        <p className="panel-title">Search analytics</p>
        <div className="metrics-grid">
          <Tile label="Total searches" value={analytics.totalSearches} />
          <Tile label="Zero-result queries" value={analytics.zeroResultQueries} />
          <Tile label="Avg response time" value={`${analytics.averageResponseTimeMs}ms`} />
        </div>
        {analytics.topQueries?.length > 0 && (
          <table className="data-table" style={{ marginTop: 14 }}>
            <thead><tr><th>Query</th><th>Count</th></tr></thead>
            <tbody>
              {analytics.topQueries.map((q) => (
                <tr key={q.query}><td>{q.query}</td><td>{q.count}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
