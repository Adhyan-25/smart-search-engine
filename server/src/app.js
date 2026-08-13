const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const v1Routes = require('./routes/v1');
const { requestLogger } = require('./middleware/requestLogger');
const { metricsMiddleware } = require('./middleware/metrics');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { config } = require('./config');

/**
 * Express app assembly, separated from server.js (section: architecture)
 * so the app can be imported and tested with supertest WITHOUT starting a
 * real HTTP listener.
 */
function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);
  app.use(metricsMiddleware);

  // Exposes which instance served the request - useful for demonstrating
  // multi-instance load distribution.
  app.use((req, res, next) => {
    res.setHeader('X-Instance-Id', config.instanceId);
    next();
  });

  app.use('/api/v1', v1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
