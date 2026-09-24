const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { HTTP_STATUS, NODE_ENVS } = require('../utils/constants');

/**
 * Global Express Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  // Handle Mongoose CastError (Invalid ID)
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid resource format: ${err.path}`);
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    error = ApiError.conflict(`Duplicate value entered for field: ${fields}`);
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    error = ApiError.badRequest('Database validation error', errors);
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid authorization token');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Authorization token has expired');
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === NODE_ENVS.DEVELOPMENT && { stack: error.stack }),
  };

  logger.error(`[${req.method}] ${req.originalUrl} - Status: ${error.statusCode} - Message: ${error.message}`);

  return res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
