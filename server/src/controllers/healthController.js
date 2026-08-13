const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redisClient');
const { config } = require('../config');

async function health(req, res) {
  const mongoState = mongoose.connection.readyState; // 1 = connected
  let redisOk = false;
  try {
    const pong = await getRedisClient().ping();
    redisOk = pong === 'PONG';
  } catch {
    redisOk = false;
  }

  const overallOk = mongoState === 1 && redisOk;

  res.status(overallOk ? 200 : 503).json({
    status: overallOk ? 'ok' : 'degraded',
    instanceId: config.instanceId,
    uptime: process.uptime(),
    dependencies: {
      mongodb: mongoState === 1 ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected',
    },
  });
}

module.exports = { health };
