require('dotenv').config();

function requireEnv(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  instanceId: process.env.INSTANCE_ID || `node-${process.pid}`,

  mongoUri: requireEnv('MONGO_URI', 'mongodb://127.0.0.1:27017/smart_search'),

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  cache: {
    lruCapacity: parseInt(process.env.LRU_CAPACITY || '500', 10),
    redisTtlSeconds: parseInt(process.env.REDIS_CACHE_TTL_SECONDS || '60', 10),
  },

  rateLimit: {
    capacity: parseInt(process.env.RATE_LIMIT_CAPACITY || '20', 10),
    refillPerSec: parseFloat(process.env.RATE_LIMIT_REFILL_PER_SEC || '5'),
  },

  bloomFilter: {
    expectedItems: parseInt(process.env.BLOOM_EXPECTED_ITEMS || '100000', 10),
    falsePositiveRate: parseFloat(process.env.BLOOM_FP_RATE || '0.01'),
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 50,
  },

  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  },
};

function validateConfig() {
  if (Number.isNaN(config.port) || config.port <= 0) {
    throw new Error('Invalid PORT');
  }
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is required');
  }
  if (config.jwt.secret === 'dev-only-insecure-secret-change-me' && config.env === 'production') {
    throw new Error('JWT_SECRET must be set to a real value in production - refusing to start with the default');
  }
  return true;
}

module.exports = { config, validateConfig };
