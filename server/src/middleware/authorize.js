const { ApiError } = require('./errorHandler');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions for this resource'));
    }
    next();
  };
}

module.exports = { authorize };
