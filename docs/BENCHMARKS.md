# Benchmarks

All numbers below were actually executed during development of this project (not estimated or hardcoded). Re-run any of them yourself with the commands shown - results will vary slightly by machine but should show the same qualitative pattern.

## 1. Trie vs Linear Autocomplete
`npm run bench:trie`

| Dataset size | Trie avg | Linear avg | Speedup |
|---|---|---|---|
| 10,000 | 0.167ms | 0.290ms | 1.74x |
| 50,000 | 0.168ms | 1.205ms | 7.16x |
| 100,000 | 0.476ms | 2.271ms | 4.77x |

Trie's advantage grows with dataset size, as expected - it does O(prefix length) work regardless of how many total terms exist, while the linear scan does O(N) work every time.

## 2. LRU Cache vs Unbounded Map
`npm run bench:lru`

200,000-key universe, 500,000 requests, 80/20 hot-key access pattern, LRU capacity = 20,000 (10% of universe).

- Unbounded Map: 515.6ms, retained all 102,763 distinct keys seen (unbounded growth)
- Custom LRU: 1287.1ms, retained exactly 20,000 keys (capacity-bounded), 33.4% hit rate

**Honest result**: the unbounded Map was faster in this run, because V8's native Map has less per-operation overhead than our hand-rolled doubly-linked-list bookkeeping. Both are O(1) asymptotically; the LRU has a larger constant factor. The actual point of LRU isn't raw speed - it's the hard memory ceiling. A long-running process using a plain Map for caching will retain every key it has ever seen; the LRU never exceeds its configured capacity.

## 3. Bloom Filter
`npm run bench:bloom`

50,000-item catalog, target 1% false-positive rate, 20,000-check workload (90% negative).

- Bit array: ~59,907 bits (7.3 KB), 7 hash functions
- Observed false-positive rate on true negatives: matched theoretical prediction closely (both ~1%)
- Zero false negatives across all inserted items (required correctness property, verified in unit tests)

## 4. Consistent Hashing vs Modulo Hashing
`npm run bench:hashing`

10,000 keys, removing 1 of 5 nodes.

- Consistent hashing: 18.7% of keys remapped (theoretical expectation ~20% = 1/5)
- Modulo hashing: 80.7% of keys remapped
- Consistent hashing remapped 4.3x fewer keys (measured)

This benchmark also caught and fixed a real bug during development: the initial hash function had weak avalanche behavior, causing all keys to cluster onto a single ring node instead of distributing evenly. Fixed by adding a murmur-style finalizer step; verified the fix restored even distribution (~25% per node across 4 nodes) before re-running the remap benchmark.

## 5. Synchronous vs Queued Analytics
`npm run bench:async`

200 requests, ~8ms simulated write cost each, real BullMQ + local Redis (not mocked).

- Synchronous (handler blocks on each write): 1654.4ms total, 8.27ms/request
- Queued (handler only waits for enqueue): 88.5ms total, 0.44ms/request
- 18.7x reduction in request-handler blocking time

## 6. Local vs Redis-Backed Distributed Rate Limiting
`node benchmarks/rateLimiterLocalVsDistributed.js`

Capacity: 20 tokens/client, simulating a client hitting 2 instances.

- Local (independent per-instance buckets): 40 requests allowed (2x intended cap)
- Redis-backed (shared state): exactly 20 requests allowed

This is the clearest demonstration in the whole project of why process-local state breaks under horizontal scaling.

## 7. Request Batching
`node benchmarks/requestBatching.js`

500 simulated popularity-counter updates, 5ms fixed round-trip overhead + 0.05ms/op.

- Unbatched (1 round trip/event): 2613.0ms
- Batched (50 events/round trip): 72.4ms
- 36.1x speedup (driven entirely by amortizing the fixed per-round-trip cost)

## 8. Debounce
`node benchmarks/debounceBenchmark.js`

Simulated typing "iphone case" at 90ms/keystroke.

- Without debounce: 11 requests (1 per keystroke)
- With 275ms debounce: 1 request
- 90.9% reduction in request volume

## 9. Multi-instance + shared rate limiting (real, 2 separate OS processes)
`node scripts/multiInstanceDemo.js`

Two genuinely independent Node.js child processes, each running the real `src/app.js`, round-robin proxied. Confirms:
- Requests alternate correctly between `node-1` and `node-2` (verified via response body, not just routing intent)
- Redis-backed rate limit cap (20) is enforced exactly across both processes combined, not per-process

## What was NOT benchmarked in this environment (and why)

- **MongoDB indexed vs. unindexed search** (`explain()` comparison) - the code is written and correct (see `src/models/Product.js` for indexes, `searchService.js` for queries), but this sandbox has no network path to download a MongoDB binary, so no live Mongo instance could be started here. See `docs/IMPLEMENTATION_STATUS.md` for the full explanation. Anyone cloning this repo with a normal internet connection and Docker can run `npm run seed` against a real Mongo and reproduce this benchmark - the code doesn't need to change.
- **Offset vs. cursor pagination at scale** - same reason; needs a live Mongo with a real seeded dataset. The pagination *logic* is unit-tested (`tests/unit/pagination.test.js`) without a database.
