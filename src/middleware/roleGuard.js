const ApiError = require('../utils/ApiError');

// Usage: roleGuard('employer', 'admin')
function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = roleGuard;
