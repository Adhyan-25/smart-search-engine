/**
 * Benchmark: Trie.getSuggestions() vs LinearAutocomplete.getSuggestions()
 * Run: node benchmarks/trieVsLinear.js
 */
const { Trie } = require('../src/algorithms/Trie');
const { LinearAutocomplete } = require('../src/algorithms/LinearAutocomplete');

function randomWord(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let w = '';
  for (let i = 0; i < len; i++) w += chars[Math.floor(Math.random() * chars.length)];
  return w;
}

function buildDataset(size) {
  // Bias toward shared prefixes so prefix search is meaningful, like real
  // product terms ("iphone", "iphone case", "iphone charger"...).
  const prefixes = Array.from({ length: Math.max(20, Math.floor(size / 50)) }, () => randomWord(4));
  const words = [];
  for (let i = 0; i < size; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    words.push(prefix + randomWord(3 + Math.floor(Math.random() * 5)));
  }
  return { words, prefixes };
}

function percentile(sortedArr, p) {
  const idx = Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length));
  return sortedArr[idx];
}

function runQueries(structure, queries) {
  const latencies = [];
  for (const q of queries) {
    const start = process.hrtime.bigint();
    structure.getSuggestions(q, 10);
    const end = process.hrtime.bigint();
    latencies.push(Number(end - start) / 1e6); // ms
  }
  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  return {
    avgMs: avg,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
  };
}

function benchmarkSize(size) {
  const { words, prefixes } = buildDataset(size);

  const trie = new Trie();
  const linear = new LinearAutocomplete();
  words.forEach((w) => {
    trie.insert(w, Math.floor(Math.random() * 100));
    linear.insert(w, Math.floor(Math.random() * 100));
  });

  const numQueries = 500;
  const queries = Array.from({ length: numQueries }, () => {
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    return p.slice(0, 2 + Math.floor(Math.random() * 2));
  });

  const trieResult = runQueries(trie, queries);
  const linearResult = runQueries(linear, queries);

  return { size, trieResult, linearResult };
}

function main() {
  const sizes = [10000, 50000, 100000];
  console.log('Trie vs Linear Autocomplete Benchmark');
  console.log('Queries per size: 500, results per query: top 10');
  console.log('='.repeat(70));
  for (const size of sizes) {
    const { trieResult, linearResult } = benchmarkSize(size);
    console.log(`\nDataset size: ${size.toLocaleString()} terms`);
    console.log(
      `  Trie:   avg=${trieResult.avgMs.toFixed(4)}ms  p50=${trieResult.p50Ms.toFixed(4)}ms  p95=${trieResult.p95Ms.toFixed(4)}ms`
    );
    console.log(
      `  Linear: avg=${linearResult.avgMs.toFixed(4)}ms  p50=${linearResult.p50Ms.toFixed(4)}ms  p95=${linearResult.p95Ms.toFixed(4)}ms`
    );
    const speedup = linearResult.avgMs / trieResult.avgMs;
    console.log(`  Trie is ${speedup.toFixed(2)}x faster than linear scan at this size (measured, not assumed)`);
  }
}

main();
