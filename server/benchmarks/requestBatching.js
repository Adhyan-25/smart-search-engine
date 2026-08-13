/**
 * Request batching demonstration (section 30).
 *
 * Real use case in this system: bumping product popularity counters after
 * search analytics jobs run. Doing this one Mongo update per event is
 * wasteful; batching writes into a single bulk operation reduces round
 * trips. This demo simulates the DB call cost to show the effect without
 * requiring a live MongoDB in this sandbox (see docs/IMPLEMENTATION_STATUS.md
 * for why Mongo itself can't run here).
 *
 * We do NOT force batching into the live search/autocomplete request path -
 * those need an immediate per-request answer, which batching would only
 * add latency to. It belongs here, in the analytics/popularity-update path,
 * where a small delay in exchange for fewer round trips is a good trade.
 */

function simulateDbRoundTrip(numOps) {
  // Model: fixed per-round-trip overhead + small per-op cost, since a real
  // network/DB round trip has a fixed cost regardless of batch size.
  const ROUND_TRIP_OVERHEAD_MS = 5;
  const PER_OP_MS = 0.05;
  return new Promise((resolve) =>
    setTimeout(resolve, ROUND_TRIP_OVERHEAD_MS + numOps * PER_OP_MS)
  );
}

async function unbatched(events) {
  const start = process.hrtime.bigint();
  for (const e of events) {
    await simulateDbRoundTrip(1); // one round trip PER event
  }
  return Number(process.hrtime.bigint() - start) / 1e6;
}

async function batched(events, batchSize) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await simulateDbRoundTrip(batch.length); // one round trip PER BATCH
  }
  return Number(process.hrtime.bigint() - start) / 1e6;
}

async function main() {
  const events = Array.from({ length: 500 }, (_, i) => ({ productId: i, delta: 1 }));

  console.log('Request Batching: popularity-counter updates');
  console.log(`Events: ${events.length}`);
  console.log('='.repeat(70));

  const unbatchedMs = await unbatched(events);
  const batchedMs = await batched(events, 50);

  console.log(`\nUnbatched (1 round trip per event): ${unbatchedMs.toFixed(1)}ms`);
  console.log(`Batched (50 events per round trip):  ${batchedMs.toFixed(1)}ms`);
  console.log(`\nSpeedup: ${(unbatchedMs / batchedMs).toFixed(1)}x (measured, driven by fixed per-round-trip overhead)`);
}

main();
