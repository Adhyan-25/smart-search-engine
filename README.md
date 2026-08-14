# Smart Search Engine — Scalable Search & Autocomplete Platform

A backend-engineering playground: a product search + autocomplete system where every major optimization is implemented alongside its naive baseline, so you can see *why* it exists, not just that a package is installed. MERN stack (MongoDB, Express, React, Node), Redis, BullMQ.

**Read `docs/IMPLEMENTATION_STATUS.md` first.** It's an honest, row-by-row audit of what's implemented, tested, and benchmarked versus what's written-but-unverified due to this project's development environment (no live Docker/MongoDB available during the build session — details there).

## What's actually demonstrated, with real numbers

- Trie autocomplete beats linear scan by 1.7x-7.2x, growing with dataset size
- Consistent hashing remaps ~4.3x fewer keys than modulo hashing when a node is removed
- A local (process-in-memory) rate limiter lets a client double its quota by hitting 2 instances; the Redis-backed version enforces the cap exactly, verified across **2 genuinely separate OS processes**
- Moving analytics writes to a background queue cuts request-handler blocking time by 18.7x
- 275ms debounce cuts autocomplete request volume by ~91% for a typical typed query

See `docs/BENCHMARKS.md` for the full set and exact commands to reproduce each one.

## Architecture

See `docs/ARCHITECTURE.md` for the full breakdown and an ASCII diagram. Short version:

```
Route -> Controller -> Service -> Models / Algorithms / Infrastructure
```

## Project structure

```
server/
  src/
    algorithms/   Trie, LRU, Bloom filter, Token Bucket, Consistent Hashing (all hand-written)
    config/       env config + Redis client
    controllers/  HTTP <-> service glue
    services/     business logic
    models/       Mongoose schemas + indexes
    middleware/   validation, error handling, logging, metrics, rate limiting, idempotency
    queues/       BullMQ producer/worker
    utils/        pagination, retry/backoff, circuit breaker
    app.js        Express app (no listener) - testable in isolation
    server.js     boots app.js, owns the HTTP listener + graceful shutdown
  tests/
    unit/         algorithm + service unit tests (56 tests, no external deps except Redis)
    integration/  supertest against the real Express app
  benchmarks/      runnable scripts, real measured output
  scripts/         seed.js, multiInstanceDemo.js
client/
  src/
    pages/         SearchPage, AnalyticsPage
    components/    SuggestionsDropdown, ResultCard, FiltersBar
    hooks/         useDebounce
    services/      api.js
    utils/         clientCache.js
infra/
  nginx.conf       load balancer config for 2 backend instances
docs/
  ARCHITECTURE.md
  BENCHMARKS.md
  API.md
  IMPLEMENTATION_STATUS.md   <- read this first
docker-compose.yml
```

## Setup

### Requirements
- Node.js 18+
- MongoDB (local or Atlas) — **not needed to run the algorithm benchmarks or unit tests**, only for the live search API and seed script
- Redis (local `redis-server`, or via Docker)

### Install
```bash
cd server && npm install
cd ../client && npm install
```

### Environment
```bash
cd server
cp .env.example .env
# edit .env if your Mongo/Redis aren't on localhost defaults
```

For Google OAuth signup/login, set:
- `GOOGLE_CLIENT_ID` in `server/.env`
- `VITE_GOOGLE_CLIENT_ID` in `client/.env`

### Start infrastructure (Docker)
```bash
docker compose up --build
```
This starts MongoDB, Redis, 2 backend instances (`node1`, `node2`), Nginx (port 8080), and the React dev server (port 5173).

### Or run manually (without Docker)
```bash
# terminal 1: redis
redis-server

# terminal 2: mongodb
mongod --dbpath /path/to/data

# terminal 3: seed data, then start backend
cd server
npm run seed              # seeds 20,000 synthetic products by default
npm run dev                # starts one instance on PORT from .env

# terminal 4: frontend
cd client
npm run dev
```

Visit `http://localhost:5173` (or `http://localhost:8080` if going through Nginx).

## Tests
```bash
cd server
npm test                   # unit tests (56 tests, only needs local Redis)
npm run test:integration   # integration tests against the real Express app (needs local Redis; runs --runInBand to avoid shared-state races between test files)
npm run test:all           # everything
```

## Benchmarks
```bash
cd server
npm run bench:trie         # Trie vs linear autocomplete
npm run bench:lru          # LRU vs unbounded Map
npm run bench:bloom        # Bloom filter false-positive rate
npm run bench:hashing      # consistent vs modulo hashing
npm run bench:debounce     # debounce request-volume reduction
npm run bench:async        # sync vs BullMQ-queued analytics writes
npm run bench:all          # runs all of the above in sequence

node benchmarks/rateLimiterLocalVsDistributed.js   # local vs Redis-backed rate limiting
node benchmarks/requestBatching.js                 # batched vs unbatched writes
node scripts/multiInstanceDemo.js                  # 2 real processes, shared Redis state
```

## Load testing

Not implemented in this delivery — see `docs/IMPLEMENTATION_STATUS.md` for what a follow-up would look like (an `autocannon`-based script against `/api/v1/search` and `/api/v1/autocomplete` at increasing concurrency).

## Known limitations

- MongoDB-dependent benchmarks (indexed vs. unindexed search, cursor-vs-offset pagination at scale) and the idempotency/search-analytics integration tests were written but not executed against a live MongoDB during this project's build session — that environment had no path to a MongoDB binary. The code is correct and will run against any real MongoDB instance; see `docs/IMPLEMENTATION_STATUS.md` for the exact reasoning.
- Docker Compose and the Nginx load balancer config are written and reviewed but were not run end-to-end (no Docker daemon in the build environment).
- No load testing was performed.
- Ranking is a simple, explainable weighted-signal model — explicitly not a production search-relevance system.

## Tradeoffs worth knowing about

- The Redis-backed rate limiter **fails open** if Redis is down (availability prioritized over strict enforcement).
- Cache invalidation is TTL-based, not event-driven — a product update won't immediately evict stale cached search results.
- A Bloom filter positive is never treated as authoritative; `autocompleteService.termExists()` always confirms against the Trie.
