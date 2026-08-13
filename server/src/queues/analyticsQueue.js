const { Queue, Worker } = require('bullmq');
const { config } = require('../config');
const SearchLog = require('../models/SearchLog');
const { retryWithBackoff } = require('../utils/retry');

const connection = { host: config.redis.host, port: config.redis.port };
const QUEUE_NAME = 'analytics';

let queue = null;
let worker = null;

function getQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection });
  }
  return queue;
}

/**
 * Enqueue analytics persistence off the critical request path (section 22).
 * If BullMQ/Redis is briefly unavailable, we log and drop the job rather
 * than blocking or failing the search response - analytics is best-effort,
 * search results are not.
 */
async function enqueueAnalyticsJob(payload) {
  try {
    await getQueue().add('log-search', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 500 },
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  } catch (err) {
    console.error(`[analyticsQueue] enqueue failed (dropping, non-critical): ${err.message}`);
  }
}

function startWorker() {
  if (worker) return worker;
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await retryWithBackoff(
        () => SearchLog.create(job.data),
        { maxRetries: 2, baseDelayMs: 200, isRetryable: () => true }
      );
    },
    { connection }
  );
  worker.on('failed', (job, err) => {
    console.error(`[analyticsQueue] job ${job?.id} failed permanently: ${err.message}`);
  });
  return worker;
}

async function closeQueue() {
  if (worker) await worker.close();
  if (queue) await queue.close();
}

module.exports = { enqueueAnalyticsJob, startWorker, closeQueue, getQueue };
