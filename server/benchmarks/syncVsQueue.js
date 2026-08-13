/**
 * Benchmark: synchronous analytics write vs enqueue-to-BullMQ (fire-and-forget).
 * Measures the time the REQUEST HANDLER is blocked in each approach, using
 * the real local Redis instance and BullMQ (not mocked).
 * Run: node benchmarks/syncVsQueue.js
 */
const { Queue } = require('bullmq');
const { config } = require('../src/config');

const connection = { host: config.redis.host, port: config.redis.port };

// Simulates the "slow" part of analytics persistence (e.g. a Mongo insert +
// aggregation update) without requiring a live MongoDB in this environment.
function simulateSlowWrite() {
  return new Promise((resolve) => setTimeout(resolve, 8)); // ~8ms, realistic for a small write
}

async function benchmarkSynchronous(n) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < n; i++) {
    await simulateSlowWrite(); // request handler BLOCKS on this
  }
  return Number(process.hrtime.bigint() - start) / 1e6;
}

async function benchmarkQueued(n) {
  const queue = new Queue('bench-analytics', { connection });
  await queue.drain(true);

  const start = process.hrtime.bigint();
  for (let i = 0; i < n; i++) {
    await queue.add('write', { i }); // request handler only waits for enqueue, not the write itself
  }
  const handlerBlockedMs = Number(process.hrtime.bigint() - start) / 1e6;

  await queue.close();
  return handlerBlockedMs;
}

async function main() {
  const n = 200;
  console.log('Synchronous Analytics Write vs Background Queue (BullMQ + real local Redis)');
  console.log(`Simulated write cost per operation: ~8ms, requests: ${n}`);
  console.log('='.repeat(70));

  const syncMs = await benchmarkSynchronous(n);
  const queuedMs = await benchmarkQueued(n);

  console.log(`\nSynchronous (handler blocks on each write): ${syncMs.toFixed(1)}ms total, ${(syncMs / n).toFixed(2)}ms/request`);
  console.log(`Queued (handler only waits for enqueue):     ${queuedMs.toFixed(1)}ms total, ${(queuedMs / n).toFixed(2)}ms/request`);
  console.log(`\nHandler-blocking time reduced by ${(syncMs / queuedMs).toFixed(1)}x (measured) by moving the write off the critical path.`);
  console.log(`Note: the actual write still happens - it just happens in a worker process`);
  console.log(`after the response has already been sent to the client.`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
