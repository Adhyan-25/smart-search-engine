/**
 * Benchmark: Bloom filter false-positive rate + "checks avoided" demo.
 * Scenario: checking whether a search term exists in our catalog before
 * hitting MongoDB. Run: node benchmarks/bloomFilter.js
 */
const { BloomFilter } = require('../src/algorithms/BloomFilter');

function main() {
  const catalogSize = 50000;
  const bf = new BloomFilter(catalogSize, 0.01);

  const catalogTerms = new Set();
  for (let i = 0; i < catalogSize; i++) {
    const term = `product-term-${i}`;
    catalogTerms.add(term);
    bf.add(term);
  }

  console.log('Bloom Filter Benchmark');
  console.log(`Catalog size: ${catalogSize.toLocaleString()}, target FP rate: 1%`);
  console.log(`Bit array size: ${bf.size.toLocaleString()} bits (${(bf.memoryBytes() / 1024).toFixed(1)} KB), hash functions: ${bf.hashCount}`);
  console.log('='.repeat(70));

  // Workload: mix of real catalog terms and made-up ones (negative-heavy,
  // simulating autocomplete-as-you-type queries that don't match anything yet)
  const workloadSize = 20000;
  const negativeRatio = 0.9; // 90% of queries are for terms NOT in the catalog
  let dbChecksAvoided = 0;
  let falsePositives = 0;
  let actualNegatives = 0;
  let actualPositives = 0;

  for (let i = 0; i < workloadSize; i++) {
    const isRealTerm = Math.random() > negativeRatio;
    const term = isRealTerm
      ? `product-term-${Math.floor(Math.random() * catalogSize)}`
      : `nonexistent-term-${i}-${Math.random().toString(36).slice(2)}`;

    const actuallyExists = catalogTerms.has(term);
    if (actuallyExists) actualPositives += 1;
    else actualNegatives += 1;

    const bloomSaysMaybe = bf.mightContain(term);
    if (!bloomSaysMaybe) {
      // Bloom filter said "definitely absent" - we skip the DB check entirely.
      dbChecksAvoided += 1;
    } else if (!actuallyExists) {
      // Bloom filter said "maybe present" but it's actually absent = false positive.
      // In a real system, this still requires a DB check, which correctly finds nothing.
      falsePositives += 1;
    }
  }

  console.log(`\nWorkload: ${workloadSize.toLocaleString()} membership checks (${(negativeRatio * 100).toFixed(0)}% for nonexistent terms)`);
  console.log(`  Actual negatives: ${actualNegatives.toLocaleString()}`);
  console.log(`  Actual positives: ${actualPositives.toLocaleString()}`);
  console.log(`  DB checks avoided (bloom said "definitely absent"): ${dbChecksAvoided.toLocaleString()}`);
  console.log(`  False positives (bloom said "maybe", DB would find nothing): ${falsePositives.toLocaleString()}`);
  console.log(`  Observed false-positive rate on negatives: ${((falsePositives / actualNegatives) * 100).toFixed(3)}%`);
  console.log(`  Theoretical current FP rate: ${(bf.currentFalsePositiveRate() * 100).toFixed(3)}%`);
  console.log(`\nWhere this helps: negative-heavy workloads (e.g. "does this term exist`);
  console.log(`at all before we bother querying Mongo") — most checks get a fast,`);
  console.log(`memory-cheap "no" without touching the database.`);
  console.log(`\nWhere this does NOT help: workloads that are mostly positive lookups`);
  console.log(`(the filter rarely says "no", so it rarely saves a DB round-trip), or`);
  console.log(`anywhere a false positive is unacceptable without a verification step -`);
  console.log(`a Bloom filter positive must always be confirmed against real storage.`);
}

main();
