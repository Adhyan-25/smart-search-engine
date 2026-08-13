# Architecture

## Layered structure

```
Route -> Controller -> Service -> Models / Algorithms / Infrastructure
```

- **Routes** (`src/routes`): declare endpoints, attach validation + rate-limit middleware.
- **Controllers** (`src/controllers`): translate HTTP <-> service calls. No business logic.
- **Services** (`src/services`): business logic - search, autocomplete, caching, ranking, rate limiting.
- **Algorithms** (`src/algorithms`): standalone, dependency-free data structures (Trie, LRU, Bloom filter, Token Bucket, Consistent Hashing). Pure logic, unit-testable without Express or a database.
- **Models** (`src/models`): Mongoose schemas + indexes.
- **Middleware** (`src/middleware`): cross-cutting concerns (validation, error handling, logging, metrics, rate limiting, idempotency).
- **Queues** (`src/queues`): BullMQ job producers/workers.

`app.js` builds the Express app; `server.js` is the only file that calls `.listen()`. This split lets integration tests import `createApp()` and exercise real routes with `supertest` without opening a network port or requiring a running server process.

## ASCII diagram

```
                        +-------------+
                        |   Client    |
                        |  (React)    |
                        +------+------+
                               |
                        +------v------+
                        |    Nginx    |   <- infra/nginx.conf
                        | (round-robin)|
                        +--+--------+-+
                           |        |
                    +------v--+  +--v------+
                    | node-1  |  | node-2  |   <- src/app.js, independent processes
                    +----+----+  +----+----+
                         |            |
                    +----v------------v----+
                    |        Redis         |  <- cache, rate limiter, BullMQ
                    +----+------------+----+
                         |            |
                    +----v----+  +----v-----+
                    | MongoDB |  | BullMQ   |
                    | (Product,|  | Worker   |
                    |  SearchLog)| (analytics)
                    +---------+  +----------+
```

## Why each optimization exists (naive -> optimized progressions)

| Naive | Optimized | Why |
|---|---|---|
| Linear prefix scan | Trie | O(prefix length) instead of O(N) per query; measured 1.7x-7.2x faster as N grows (see BENCHMARKS.md) |
| Unindexed Mongo query | Text + compound indexes | Avoids full collection scans on search/filter |
| `skip()/limit()` | Cursor pagination | `skip(N)` still walks past N docs; cursor uses an indexed `_id > cursor` range, constant-time regardless of depth |
| Unbounded `Map` cache | Custom LRU | Bounded memory footprint under sustained traffic |
| Local LRU only | + Redis cache-aside | Shared across instances; local LRU alone diverges per-process |
| Local token bucket | Redis-backed token bucket (atomic Lua script) | Local buckets are per-process; a client can multiply their effective rate by however many instances exist. Measured in `bench:rate-limiter-demo`: local let a client through 2x its cap by hitting 2 instances; Redis-backed enforced the cap exactly |
| Synchronous analytics write | BullMQ background job | Removes DB write latency from the request's critical path (measured 18.7x reduction in handler-blocking time) |
| Direct dependency calls | Retry w/ backoff + circuit breaker | Retries handle transient failures; the breaker stops hammering an already-failing dependency |
| Modulo hashing | Consistent hashing ring | Removing a node under modulo reshuffles nearly all keys; consistent hashing remaps roughly 1/N (measured ~18.7% vs ~80.7% removing 1 of 5 nodes) |

## Known architectural limitations

- **Ranking is intentionally simple** (see `rankingService.js`) - explainable weighted scoring, not a production relevance model.
- **Bloom filter false positives require confirmation.** `autocompleteService.termExists()` always falls through to the authoritative Trie on a Bloom "maybe."
- **Cache invalidation is TTL-based**, not event-driven; a product update won't proactively evict stale cached search results until the TTL expires (documented tradeoff, not a bug).
- **The Redis rate limiter fails open** if Redis is unreachable (availability over strict enforcement - see `rateLimiterService.js`).
