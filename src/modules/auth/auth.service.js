const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const User = require('../users/users.model');
const ApiError = require('../../utils/apiError');
const logger = require('../../utils/logger');

class AuthService {
  /**
   * Authenticate admin user with email and password
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async loginUser({ email, password }) {
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user and explicitly select password hash
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // Generic error message to prevent user enumeration
    if (!user) {
      logger.warn(`Failed login attempt for non-existent email: ${normalizedEmail}`);
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // 2. Verify hashed password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      logger.warn(`Failed login attempt for email: ${normalizedEmail} (password mismatch)`);
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // 3. Verify user status
    if (user.status !== 'active') {
      logger.warn(`Login rejected: account is ${user.status} for email: ${normalizedEmail}`);
      throw ApiError.unauthorized(`Account is ${user.status}. Please contact the system administrator.`);
    }

    // 4. Generate signed JWT token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN,
      }
    );

    // 5. Update last login timestamp without triggering password rehash
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`Admin user authenticated successfully: [${user.role}] ${user.email}`);

    return {
      user: user.toPublicJSON(),
      token,
    };
  }
}

module.exports = new AuthService();
