# API Documentation

Base path: `/api/v1`

All error responses share this shape:
```json
{ "error": { "message": "string", "statusCode": 400, "details": ["optional array"] } }
```

---

## GET /api/v1/search

Full-text product search with filtering, sorting, and pagination.

**Query parameters**

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | - | Search text (optional; omit for filter-only browsing) |
| `page` | integer | 1 | Offset-pagination page number (ignored if `after` is present) |
| `limit` | integer | 20 | Max 50 |
| `after` | string | - | Cursor for cursor-pagination mode; if present, offset pagination is bypassed |
| `category` | string | - | Exact category match |
| `minPrice` / `maxPrice` | number | - | Price range filter |
| `minRating` | number | - | 0-5 |
| `sort` | string | `relevance` | One of `relevance`, `price_asc`, `price_desc`, `rating`, `popularity`, `newest` |

**Response (offset mode, 200)**
```json
{
  "query": "iphone",
  "results": [ { "_id": "...", "title": "...", "price": 199.99, "_relevance": { "score": 62.4, "breakdown": {} } } ],
  "pagination": { "page": 1, "limit": 20, "totalResults": 134, "totalPages": 7, "hasNextPage": true, "hasPreviousPage": false },
  "_meta": { "responseTimeMs": 12, "instanceId": "node-1" }
}
```

**Response (cursor mode, when `after` is supplied, 200)**
```json
{
  "results": [ ... ],
  "pagination": { "limit": 20, "hasNextPage": true, "nextCursor": "NTA3ZjFmNzdiY2Y4NmNkNzk5NDM5MDEx" }
}
```

**Status codes**: `200` success, `400` invalid query params, `429` rate limited, `500` server error.

---

## GET /api/v1/autocomplete

**Query parameters**

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | required | Prefix text, 1-100 chars |
| `limit` | integer | 10 | Max 20 |

**Response (200)**
```json
{ "query": "iph", "suggestions": [ { "word": "iphone case", "popularity": 50 } ], "_meta": { "responseTimeMs": 1 } }
```

**Status codes**: `200`, `400` (missing/invalid `q`), `429`.

---

## GET /api/v1/health

No parameters.

**Response (200 healthy / 503 degraded)**
```json
{
  "status": "ok",
  "instanceId": "node-1",
  "uptime": 1234.5,
  "dependencies": { "mongodb": "connected", "redis": "connected" }
}
```

---

## GET /api/v1/metrics

Engineering metrics snapshot (request counts, latency percentiles, cache stats, rate-limit rejections).

**Response (200)**
```json
{
  "uptimeSec": 120.4,
  "requestCount": 342,
  "errorRate": 0.0029,
  "requestsPerSecond": 2.84,
  "latency": {
    "search": { "p50": 8.2, "p95": 22.1, "p99": 40.0, "samples": 200 },
    "autocomplete": { "p50": 1.1, "p95": 3.4, "p99": 5.0, "samples": 150 }
  },
  "cache": {
    "lru": { "hits": 40, "misses": 12, "hitRate": 0.77, "size": 40, "capacity": 500 },
    "redis": { "hits": 8, "misses": 4, "errors": 0, "hitRate": 0.67 },
    "bloomFilter": { "insertedCount": 20000, "currentFalsePositiveRate": 0.0098, "memoryBytes": 23962 }
  },
  "rateLimit": { "rejectedCount": 3 }
}
```

---

## GET /api/v1/analytics

Product-search analytics (distinct from engineering metrics above).

**Response (200)**
```json
{
  "totalSearches": 5231,
  "zeroResultQueries": 89,
  "averageResponseTimeMs": 14.2,
  "topQueries": [ { "query": "iphone", "count": 412 } ]
}
```

---

## Example requests (curl)

```bash
curl "http://localhost:4000/api/v1/search?q=iphone&page=1&limit=10&sort=rating"
curl "http://localhost:4000/api/v1/autocomplete?q=iph&limit=5"
curl "http://localhost:4000/api/v1/health"
curl "http://localhost:4000/api/v1/metrics"
```

A Postman collection is not included in this delivery (see `docs/IMPLEMENTATION_STATUS.md` for scope notes); the curl examples above and the request/response shapes documented here cover the same information.
