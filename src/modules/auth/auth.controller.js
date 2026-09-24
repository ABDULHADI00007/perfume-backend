const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const authService = require('./auth.service');
const { getAuthCookieName, getAuthCookieOptions } = require('../../utils/cookie');

/**
 * Admin Login Endpoint
 * Authenticates credentials, generates JWT, and sets secure HTTP-only cookie
 */
const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.loginUser(req.body);

  const cookieName = getAuthCookieName();
  const cookieOptions = getAuthCookieOptions();

  // Attach JWT in secure HTTP-only cookie
  res.cookie(cookieName, token, cookieOptions);

  return ApiResponse.success(res, 200, 'Logged in successfully', { user });
});

/**
 * Admin Logout Endpoint
 * Clears authentication HTTP-only cookie
 */
const logout = asyncHandler(async (req, res) => {
  const cookieName = getAuthCookieName();
  const cookieOptions = getAuthCookieOptions();

  res.clearCookie(cookieName, { ...cookieOptions, maxAge: 0 });

  return ApiResponse.success(res, 200, 'Logged out successfully');
});

/**
 * Get Current Authenticated User (GET /auth/me)
 */
const getMe = asyncHandler(async (req, res) => {
  const user = req.user.toPublicJSON ? req.user.toPublicJSON() : req.user;
  return ApiResponse.success(res, 200, 'Authenticated profile retrieved successfully', user);
});

module.exports = {
  login,
  logout,
  getMe,
};
