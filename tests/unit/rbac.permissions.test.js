const { hasPermission } = require('../../src/utils/permissions');
const { ROLES } = require('../../src/utils/constants');

describe('RBAC & Granular Permission Matrix Suite', () => {
  describe('Superadmin Permissions', () => {
    test('superadmin has universal clearance for all permissions', () => {
      expect(hasPermission(ROLES.SUPERADMIN, 'users.create')).toBe(true);
      expect(hasPermission(ROLES.SUPERADMIN, 'users.delete')).toBe(true);
      expect(hasPermission(ROLES.SUPERADMIN, 'settings.update')).toBe(true);
      expect(hasPermission(ROLES.SUPERADMIN, 'orders.cancel')).toBe(true);
      expect(hasPermission(ROLES.SUPERADMIN, 'any.custom.permission')).toBe(true);
    });
  });

  describe('Admin Permissions', () => {
    test('admin can manage products, orders, inventory, and reviews', () => {
      expect(hasPermission(ROLES.ADMIN, 'products.create')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'products.update')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'inventory.adjust')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'orders.cancel')).toBe(true);
    });

    test('admin is restricted from creating or deleting users and updating system settings', () => {
      expect(hasPermission(ROLES.ADMIN, 'users.create')).toBe(false);
      expect(hasPermission(ROLES.ADMIN, 'users.delete')).toBe(false);
      expect(hasPermission(ROLES.ADMIN, 'settings.update')).toBe(false);
    });
  });

  describe('Scent Specialist Permissions', () => {
    test('scent specialist can manage fragrance products, categories, collections, and reviews', () => {
      expect(hasPermission(ROLES.SCENT_SPECIALIST, 'products.create')).toBe(true);
      expect(hasPermission(ROLES.SCENT_SPECIALIST, 'categories.manage')).toBe(true);
      expect(hasPermission(ROLES.SCENT_SPECIALIST, 'reviews.moderate')).toBe(true);
    });

    test('scent specialist cannot adjust inventory or manage orders', () => {
      expect(hasPermission(ROLES.SCENT_SPECIALIST, 'inventory.adjust')).toBe(false);
      expect(hasPermission(ROLES.SCENT_SPECIALIST, 'orders.cancel')).toBe(false);
      expect(hasPermission(ROLES.SCENT_SPECIALIST, 'users.create')).toBe(false);
    });
  });

  describe('Inventory Manager Permissions', () => {
    test('inventory manager can read products, read orders, and adjust stock', () => {
      expect(hasPermission(ROLES.INVENTORY_MANAGER, 'inventory.read')).toBe(true);
      expect(hasPermission(ROLES.INVENTORY_MANAGER, 'inventory.adjust')).toBe(true);
      expect(hasPermission(ROLES.INVENTORY_MANAGER, 'orders.read')).toBe(true);
    });

    test('inventory manager cannot create products or moderate reviews', () => {
      expect(hasPermission(ROLES.INVENTORY_MANAGER, 'products.create')).toBe(false);
      expect(hasPermission(ROLES.INVENTORY_MANAGER, 'reviews.moderate')).toBe(false);
    });
  });

  describe('Staff Permissions', () => {
    test('staff has read-only access to products, inventory, orders, and customers', () => {
      expect(hasPermission(ROLES.STAFF, 'products.read')).toBe(true);
      expect(hasPermission(ROLES.STAFF, 'orders.read')).toBe(true);
      expect(hasPermission(ROLES.STAFF, 'inventory.read')).toBe(true);
      expect(hasPermission(ROLES.STAFF, 'customers.read')).toBe(true);
    });

    test('staff cannot perform any mutations or modifications', () => {
      expect(hasPermission(ROLES.STAFF, 'products.create')).toBe(false);
      expect(hasPermission(ROLES.STAFF, 'inventory.adjust')).toBe(false);
      expect(hasPermission(ROLES.STAFF, 'orders.cancel')).toBe(false);
    });
  });
});
