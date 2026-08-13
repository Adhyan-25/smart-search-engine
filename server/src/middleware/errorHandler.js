/** Standard API error shape used across all endpoints. */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Centralized error handler - every route delegates errors here via
// next(err) instead of writing its own try/catch response logic.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  const body = {
    error: {
      message: err.message || 'Internal server error',
      statusCode,
    },
  };
  if (err.details) body.error.details = err.details;
  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }
  res.status(statusCode).json(body);
}

module.exports = { ApiError, notFoundHandler, errorHandler };
