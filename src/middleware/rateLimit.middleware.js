const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS } = require('../utils/constants');

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, 'Too many requests, please try again later.'));
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // Limit auth attempts to 15 per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, 'Too many authentication attempts. Please wait 15 minutes.'));
  },
});

const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit checkout orders to 30 per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, 'Too many order requests. Please try again later.'));
  },
});

const newsletterRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Limit newsletter signups to 10 per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, 'Too many subscription requests. Please try again later.'));
  },
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  checkoutRateLimiter,
  newsletterRateLimiter,
};
