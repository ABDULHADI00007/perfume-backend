const ApiError = require('../utils/apiError');

/**
 * Generic Zod validation middleware wrapper
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });
    
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    return next();
  } catch (error) {
    if (error.errors) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(ApiError.badRequest('Validation error', formattedErrors));
    }
    return next(error);
  }
};

module.exports = validate;
