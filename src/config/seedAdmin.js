const User = require('../modules/users/users.model');
const env = require('./env');
const { ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Idempotent Superadmin Account Seeder
 * In production, explicit credentials (ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD >= 12 chars)
 * are strictly required. Startup fails safely if they are missing.
 */
const seedSuperAdmin = async () => {
  const existingSuperadmin = await User.findOne({ role: ROLES.SUPERADMIN });
  if (existingSuperadmin) {
    return;
  }

  const isProduction = env.NODE_ENV === 'production';
  const seedEmail = env.ADMIN_SEED_EMAIL ? env.ADMIN_SEED_EMAIL.toLowerCase().trim() : null;
  const seedPassword = env.ADMIN_SEED_PASSWORD;

  if (isProduction) {
    if (!seedEmail || !seedPassword || seedPassword.length < 12) {
      const errorMsg =
        'FATAL: Production superadmin bootstrapping requires ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD (minimum 12 characters). Aborting startup.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  const email = seedEmail || 'admin@perfume.com';
  const password = seedPassword || 'DevSecurePassword123!';

  if (!isProduction && !seedPassword) {
    logger.warn('⚠️ [DEV WARNING] Using default development seed credentials. Configure ADMIN_SEED_PASSWORD in your environment.');
  }

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
};

module.exports = seedSuperAdmin;
