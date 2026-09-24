const ApiError = require('../utils/apiError');
const { ROLES } = require('../utils/constants');

/**
 * Role-Based Authorization Middleware
 * @param {...string} allowedRoles - Permitted roles ('superadmin', 'admin', 'scent_specialist', etc.)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User context missing for role authorization'));
    }

    // Superadmin has omnipotent role clearance
    if (req.user.role === ROLES.SUPERADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Role '${req.user.role}' is not authorized to access this resource`)
      );
    }

    next();
  };
};

module.exports = {
  authorize,
  requireRole: authorize,
};
