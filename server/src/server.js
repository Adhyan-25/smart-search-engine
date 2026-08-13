const mongoose = require('mongoose');
const { createApp } = require('./app');
const { config, validateConfig } = require('./config');
const { getRedisClient } = require('./config/redisClient');
const { startWorker, closeQueue } = require('./queues/analyticsQueue');
const { initFromTerms } = require('./services/autocompleteService');
const Product = require('./models/Product');

async function buildAutocompleteIndexFromCatalog() {
  // Pulls searchable titles and keywords from Mongo to seed the Trie +
  // Bloom filter at startup. In a bigger system this would be a dedicated
  // "search terms" collection updated incrementally; keeping it simple here.
  const products = await Product.find({}, { title: 1, keywords: 1, popularity: 1 }).lean();
  const terms = products.flatMap((p) =>
    [p.title, ...(p.keywords || [])].map((term) => ({ term, popularity: p.popularity || 1 }))
  );
  initFromTerms(terms);
  console.log(`[startup] Autocomplete index built from ${terms.length} terms`);
}

async function start() {
  validateConfig();

  await mongoose.connect(config.mongoUri);
  console.log(`[startup] MongoDB connected: ${config.mongoUri}`);

  await getRedisClient().connect?.().catch(() => {}); // ioredis auto-connects; no-op if already connected

  try {
    await buildAutocompleteIndexFromCatalog();
  } catch (err) {
    console.error(`[startup] Failed to build autocomplete index (continuing with empty index): ${err.message}`);
  }

  startWorker();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[startup] Instance ${config.instanceId} listening on port ${config.port}`);
  });

  // Graceful shutdown (section 33): stop accepting new connections, then
  // close DB/Redis/queue connections before exiting.
  async function shutdown(signal) {
    console.log(`[shutdown] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      console.log('[shutdown] HTTP server closed');
      try {
        await closeQueue();
        console.log('[shutdown] Queue closed');
        await mongoose.connection.close();
        console.log('[shutdown] MongoDB connection closed');
        await getRedisClient().quit();
        console.log('[shutdown] Redis connection closed');
      } catch (err) {
        console.error('[shutdown] Error during cleanup:', err);
      }
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[startup] Fatal error during startup:', err);
    process.exit(1);
  });
}

module.exports = { start };
