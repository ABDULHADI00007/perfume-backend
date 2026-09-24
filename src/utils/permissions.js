const { ROLES } = require('./constants');

/**
 * Platform Permission Matrix
 * Maps each administrative role to a list of allowed granular permissions
 */
const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: [
    // Superadmin has full omnipotent access
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'products.read',
    'products.create',
    'products.update',
    'products.archive',
    'inventory.read',
    'inventory.adjust',
    'orders.read',
    'orders.update',
    'orders.cancel',
    'customers.read',
    'customers.update',
    'reviews.read',
    'reviews.moderate',
    'coupons.read',
    'coupons.create',
    'coupons.update',
    'categories.manage',
    'collections.manage',
    'blog.manage',
    'newsletter.manage',
    'settings.read',
    'settings.update',
  ],

  [ROLES.ADMIN]: [
    'products.read',
    'products.create',
    'products.update',
    'products.archive',
    'inventory.read',
    'inventory.adjust',
    'orders.read',
    'orders.update',
    'orders.cancel',
    'customers.read',
    'customers.update',
    'reviews.read',
    'reviews.moderate',
    'coupons.read',
    'coupons.create',
    'coupons.update',
    'categories.manage',
    'collections.manage',
    'blog.manage',
    'newsletter.manage',
    'settings.read',
  ],

  [ROLES.SCENT_SPECIALIST]: [
    'products.read',
    'products.create',
    'products.update',
    'categories.manage',
    'collections.manage',
    'reviews.read',
    'reviews.moderate',
    'blog.manage',
  ],

  [ROLES.INVENTORY_MANAGER]: [
    'products.read',
    'inventory.read',
    'inventory.adjust',
    'orders.read',
  ],

  [ROLES.STAFF]: [
    'products.read',
    'inventory.read',
    'orders.read',
    'customers.read',
  ],
};

/**
 * Check if a role possesses a specific permission
 * @param {string} role - User role
 * @param {string} permission - Required permission
 * @returns {boolean}
 */
const hasPermission = (role, permission) => {
  if (!role) return false;
  if (role === ROLES.SUPERADMIN) return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
};
