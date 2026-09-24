const { HTTP_STATUS } = require('./constants');

/**
 * Standardized API Response Formatter
 */
class ApiResponse {
  constructor(statusCode, message = 'Success', data = {}, meta = {}) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static success(res, statusCode = HTTP_STATUS.OK, message = 'Success', data = {}, meta = {}) {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, data, meta));
  }

  static created(res, message = 'Resource created successfully', data = {}, meta = {}) {
    return res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, message, data, meta));
  }
}

module.exports = ApiResponse;
