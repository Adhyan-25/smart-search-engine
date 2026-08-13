const { verifyToken } = require('../services/authService');
const { ApiError } = require('./errorHandler');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

module.exports = { authenticate };
