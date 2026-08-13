const { randomUUID } = require('crypto');

/**
 * Structured request logging + response-time measurement in one middleware
 * (sections 18/19). Attaches a correlation ID to every request/response.
 */
function requestLogger(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  const startNs = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    req.responseTimeMs = durationMs;
    const logLine = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: +durationMs.toFixed(2),
      correlationId,
    };
    // Deliberately no credentials/secrets/headers logged.
    console.log(JSON.stringify(logLine));
  });
  next();
}

module.exports = { requestLogger };
