const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../modules/users/users.model');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { getAuthCookieName } = require('../utils/cookie');

/**
 * Admin Authentication Middleware
 * Verifies JWT token from HTTP-only cookie or Authorization header,
 * verifies active account status in database, and attaches user to request.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const cookieName = getAuthCookieName();
  let token = req.cookies?.[cookieName];

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(ApiError.unauthorized('Authentication required. Please log in.'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Session has expired. Please log in again.'));
    }
    return next(ApiError.unauthorized('Invalid authentication token.'));
  }

  if (!decoded || !decoded.id) {
    return next(ApiError.unauthorized('Malformed authentication token payload.'));
  }

  // Verify current user state from database (prevent stale JWT state)
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(ApiError.unauthorized('User account associated with this session no longer exists.'));
  }

  if (user.status !== 'active') {
    return next(
      ApiError.unauthorized(
        `Account is ${user.status}. Please contact the system administrator.`
      )
    );
  }

  req.user = user;
  return next();
});

module.exports = {
  authenticate,
  requireAuth: authenticate,
};
