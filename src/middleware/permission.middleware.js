const ApiError = require('../utils/apiError');
const { ROLES } = require('../utils/constants');
const { hasPermission } = require('../utils/permissions');

/**
 * Granular Permission-Based Access Control Middleware
 * @param {...string} requiredPermissions - Permissions required to access route (e.g. 'products.create')
 */
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User context missing for permission authorization'));
    }

    // Superadmin bypasses all permission checks
    if (req.user.role === ROLES.SUPERADMIN) {
      return next();
    }

    const missingPermissions = requiredPermissions.filter(
      (perm) => !hasPermission(req.user.role, perm)
    );

    if (missingPermissions.length > 0) {
      return next(
        ApiError.forbidden(
          `Permission denied: Account lacks required permissions: [${missingPermissions.join(', ')}]`
        )
      );
    }

    next();
  };
};

module.exports = {
  requirePermission,
};
