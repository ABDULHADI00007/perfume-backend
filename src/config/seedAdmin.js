const User = require('../modules/users/users.model');
const env = require('./env');
const { ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Idempotent Superadmin Account Seeder
 */
const seedSuperAdmin = async () => {
  try {
    const existingSuperadmin = await User.findOne({ role: ROLES.SUPERADMIN });
    if (existingSuperadmin) {
      return;
    }

    const email = (env.ADMIN_SEED_EMAIL || 'admin@perfume.com').toLowerCase().trim();
    const password = env.ADMIN_SEED_PASSWORD || 'AdminSecurePassword123!';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      existingUser.role = ROLES.SUPERADMIN;
      existingUser.status = 'active';
      await existingUser.save();
      logger.info(`Promoted existing user ${email} to Superadmin.`);
      return;
    }

    await User.create({
      name: 'System Superadmin',
      email,
      password,
      role: ROLES.SUPERADMIN,
      status: 'active',
    });

    logger.info(`Initial Superadmin initialized successfully: ${email}`);
  } catch (error) {
    logger.error(`Error bootstrapping initial superadmin: ${error.message}`);
  }
};

module.exports = seedSuperAdmin;
