const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const Product = require('../../src/modules/products/products.model');
const Inventory = require('../../src/modules/inventory/inventory.model');
const Order = require('../../src/modules/orders/orders.model');
const seedSuperAdmin = require('../../src/config/seedAdmin');
const { ROLES } = require('../../src/utils/constants');

describe('Priority 2 Security Remediation Test Suite (SEC-VULN-05, SEC-VULN-06, SEC-VULN-08)', () => {
  // Mock User IDs and Tokens for each role
  const generateTokenForRole = (role) => {
    const id = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign(
      { id, email: `${role}@soulmatescents.com`, role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return { id, token };
  };

  const superadminUser = generateTokenForRole(ROLES.SUPERADMIN);
  const adminUser = generateTokenForRole(ROLES.ADMIN);
  const scentSpecialistUser = generateTokenForRole(ROLES.SCENT_SPECIALIST);
  const inventoryManagerUser = generateTokenForRole(ROLES.INVENTORY_MANAGER);
  const staffUser = generateTokenForRole(ROLES.STAFF);

  const mockUsers = [
    superadminUser,
    adminUser,
    scentSpecialistUser,
    inventoryManagerUser,
    staffUser,
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const match = mockUsers.find((u) => u.id === id?.toString());
      if (match) {
        return Promise.resolve({
          _id: match.id,
          role: match.token ? jwt.decode(match.token).role : 'user',
          status: 'active',
          name: `Mock ${match.id}`,
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('SEC-VULN-05: RBAC Middleware Alignment & Principle of Least Privilege', () => {
    const sampleProductId = new mongoose.Types.ObjectId();
    const sampleOrderId = new mongoose.Types.ObjectId();

    const createMockQuery = (result = []) => {
      const query = {};
      query.sort = jest.fn().mockReturnValue(query);
      query.skip = jest.fn().mockReturnValue(query);
      query.limit = jest.fn().mockReturnValue(query);
      query.populate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(query);
      query.select = jest.fn().mockReturnValue(query);
      query.exec = jest.fn().mockResolvedValue(result);
      query.then = (onFulfilled) => Promise.resolve(result).then(onFulfilled);
      return query;
    };

    beforeEach(() => {
      jest.spyOn(Product, 'findOne').mockResolvedValue({
        _id: sampleProductId,
        name: 'Velvet Oud',
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(Product, 'findById').mockResolvedValue({
        _id: sampleProductId,
        name: 'Velvet Oud',
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(Order, 'findById').mockResolvedValue({
        _id: sampleOrderId,
        orderNumber: 'ORD-TEST-001',
        status: 'pending',
        paymentStatus: 'pending',
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(Order, 'find').mockImplementation(() => createMockQuery([]));
      jest.spyOn(Order, 'countDocuments').mockResolvedValue(0);

      jest.spyOn(Inventory, 'find').mockImplementation(() => createMockQuery([]));
      jest.spyOn(Inventory, 'countDocuments').mockResolvedValue(0);
    });

    // 1. Scent Specialist Role Permissions
    it('scent_specialist can create products (products.create)', async () => {
      jest.spyOn(Product, 'create').mockResolvedValue({
        _id: sampleProductId,
        name: 'Amber Musk',
        slug: 'amber-musk',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${scentSpecialistUser.token}`)
        .send({
          name: 'Amber Musk',
          description: 'A luxurious oriental amber scent with sensual musk notes.',
          price: 4500,
          category: new mongoose.Types.ObjectId().toString(),
          sku: 'AMB-MSK-01',
          stock: 50,
        });

      // Status should be 201 Created or 400 Validation Error, NOT 403 Forbidden
      expect(res.status).not.toBe(403);
    });

    it('scent_specialist CANNOT archive products (lacks products.archive, 403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${sampleProductId}`)
        .set('Authorization', `Bearer ${scentSpecialistUser.token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Permission denied/i);
    });

    it('scent_specialist CANNOT read or update orders (403)', async () => {
      const readRes = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${scentSpecialistUser.token}`);

      expect(readRes.status).toBe(403);

      const updateRes = await request(app)
        .post(`/api/v1/orders/${sampleOrderId}/payment/approve`)
        .set('Authorization', `Bearer ${scentSpecialistUser.token}`);

      expect(updateRes.status).toBe(403);
    });

    it('scent_specialist CANNOT adjust inventory (403)', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${scentSpecialistUser.token}`)
        .send({ sku: 'VEL-OUD-50', quantityChange: 10, reason: 'restock' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Permission denied/i);
    });

    // 2. Inventory Manager Role Permissions
    it('inventory_manager CAN read orders and inventory', async () => {
      const invRes = await request(app)
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${inventoryManagerUser.token}`);

      expect(invRes.status).toBe(200);

      const orderRes = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${inventoryManagerUser.token}`);

      expect(orderRes.status).toBe(200);
    });

    it('inventory_manager CANNOT update or cancel orders (403)', async () => {
      const approveRes = await request(app)
        .post(`/api/v1/orders/${sampleOrderId}/payment/approve`)
        .set('Authorization', `Bearer ${inventoryManagerUser.token}`);

      expect(approveRes.status).toBe(403);

      const cancelRes = await request(app)
        .post(`/api/v1/orders/${sampleOrderId}/cancel`)
        .set('Authorization', `Bearer ${inventoryManagerUser.token}`)
        .send({ reason: 'customer request' });

      expect(cancelRes.status).toBe(403);
    });

    it('inventory_manager CANNOT create or archive products (403)', async () => {
      const createRes = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${inventoryManagerUser.token}`)
        .send({ name: 'Unauthorized Product' });

      expect(createRes.status).toBe(403);

      const deleteRes = await request(app)
        .delete(`/api/v1/products/${sampleProductId}`)
        .set('Authorization', `Bearer ${inventoryManagerUser.token}`);

      expect(deleteRes.status).toBe(403);
    });

    // 3. Staff Role Permissions
    it('staff CAN read orders and inventory, but CANNOT adjust inventory (403)', async () => {
      const readOrders = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${staffUser.token}`);

      expect(readOrders.status).toBe(200);

      const adjustRes = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${staffUser.token}`)
        .send({ sku: 'VEL-OUD-50', quantityChange: 5, reason: 'correction' });

      expect(adjustRes.status).toBe(403);
    });

    // 4. Admin and Superadmin Roles
    it('superadmin has full access across all restricted endpoints', async () => {
      const invRes = await request(app)
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${superadminUser.token}`);

      expect(invRes.status).toBe(200);

      const orderRes = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${superadminUser.token}`);

      expect(orderRes.status).toBe(200);
    });
  });

  describe('SEC-VULN-06: Default Superadmin Password Removal in Production', () => {
    it('does nothing and does not modify password if superadmin already exists', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValueOnce({
        _id: 'existing-superadmin-id',
        role: ROLES.SUPERADMIN,
      });

      const createSpy = jest.spyOn(User, 'create');
      await seedSuperAdmin();

      expect(createSpy).not.toHaveBeenCalled();
    });

    it('throws a fatal error in production when ADMIN_SEED_PASSWORD is missing or shorter than 12 characters', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      const originalEnv = env.NODE_ENV;
      const originalPwd = env.ADMIN_SEED_PASSWORD;
      const originalEmail = env.ADMIN_SEED_EMAIL;

      try {
        env.NODE_ENV = 'production';
        env.ADMIN_SEED_EMAIL = 'admin@soulmatescents.com';
        env.ADMIN_SEED_PASSWORD = ''; // Missing password

        await expect(seedSuperAdmin()).rejects.toThrow(
          /FATAL: Production superadmin bootstrapping requires ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD/i
        );

        env.ADMIN_SEED_PASSWORD = 'short'; // Too short (<12 chars)
        await expect(seedSuperAdmin()).rejects.toThrow(
          /FATAL: Production superadmin bootstrapping requires ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD/i
        );
      } finally {
        env.NODE_ENV = originalEnv;
        env.ADMIN_SEED_PASSWORD = originalPwd;
        env.ADMIN_SEED_EMAIL = originalEmail;
      }
    });

    it('succeeds in production when valid credentials (>= 12 chars) are provided', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      const createSpy = jest.spyOn(User, 'create').mockResolvedValueOnce({
        name: 'System Superadmin',
        email: 'prod-admin@soulmatescents.com',
        role: ROLES.SUPERADMIN,
      });

      const originalEnv = env.NODE_ENV;
      const originalPwd = env.ADMIN_SEED_PASSWORD;
      const originalEmail = env.ADMIN_SEED_EMAIL;

      try {
        env.NODE_ENV = 'production';
        env.ADMIN_SEED_EMAIL = 'prod-admin@soulmatescents.com';
        env.ADMIN_SEED_PASSWORD = 'SuperSecureLongPassword2026!';

        await seedSuperAdmin();

        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'prod-admin@soulmatescents.com',
            role: ROLES.SUPERADMIN,
          })
        );
      } finally {
        env.NODE_ENV = originalEnv;
        env.ADMIN_SEED_PASSWORD = originalPwd;
        env.ADMIN_SEED_EMAIL = originalEmail;
      }
    });
  });

  describe('SEC-VULN-08: Dedicated API Rate Limiting for Coupons & Reviews', () => {
    it('coupon validation endpoint is protected with rate limiting headers', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .send({ code: 'INVALID_COUPON', cartTotal: 5000 });

      // Check standard rate-limit headers (ratelimit-limit or x-ratelimit-limit)
      const hasRateLimitHeader =
        res.headers['ratelimit-limit'] ||
        res.headers['x-ratelimit-limit'] ||
        res.headers['ratelimit-remaining'] ||
        res.headers['x-ratelimit-remaining'];

      expect(hasRateLimitHeader).toBeDefined();
    });

    it('review submission endpoint is protected with rate limiting headers', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .send({
          productId: new mongoose.Types.ObjectId().toString(),
          rating: 5,
          title: 'Exquisite fragrance',
          comment: 'Best scent I have ever used, lasts all day.',
          authorName: 'Ahmad Khan',
          authorEmail: 'ahmad@example.com',
        });

      const hasRateLimitHeader =
        res.headers['ratelimit-limit'] ||
        res.headers['x-ratelimit-limit'] ||
        res.headers['ratelimit-remaining'] ||
        res.headers['x-ratelimit-remaining'];

      expect(hasRateLimitHeader).toBeDefined();
    });
  });
});
