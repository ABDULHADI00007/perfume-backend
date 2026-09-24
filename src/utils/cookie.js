const env = require('../config/env');

/**
 * Get cookie name for administrative authentication
 * @returns {string}
 */
const getAuthCookieName = () => {
  return env.AUTH_COOKIE_NAME || env.COOKIE_NAME || 'admin_token';
};

/**
 * Generate secure HTTP-only cookie configuration options
 * @returns {import('express').CookieOptions}
 */
const getAuthCookieOptions = () => {
  const isProd = env.NODE_ENV === 'production';
  const secure = env.AUTH_COOKIE_SECURE !== undefined ? env.AUTH_COOKIE_SECURE : isProd;

  return {
    httpOnly: true,
    secure,
    sameSite: env.AUTH_COOKIE_SAME_SITE || 'lax',
    domain: env.AUTH_COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
};

module.exports = {
  getAuthCookieName,
  getAuthCookieOptions,
};
