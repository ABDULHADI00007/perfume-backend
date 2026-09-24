const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const Order = require('../../src/modules/orders/orders.model');
const Product = require('../../src/modules/products/products.model');
const Customer = require('../../src/modules/customers/customers.model');
const Settings = require('../../src/modules/settings/settings.model');
const inventoryService = require('../../src/modules/inventory/inventory.service');

describe('Phase 7 — Production Hardening & Security Suite', () => {
  const adminToken = jwt.sign(
    { id: 'sec_admin', email: 'admin@perfume.com', role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const customerToken = jwt.sign(
    { id: 'sec_customer', email: 'customer@perfume.com', role: 'customer' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const sampleProductId = new mongoose.Types.ObjectId();
  const sampleProduct = {
    _id: sampleProductId,
    name: 'Oud Mystique Extrait',
    status: 'active',
    price: 350,
    sku: 'OUD-MYS',
    variants: [{ size: '100ml', price: 350, sku: 'OUD-MYS-100', status: 'active' }],
    images: [{ url: 'https://cdn.example.com/oud.jpg', isPrimary: true }],
  };

  const sampleSettings = {
    _id: 'settings-1',
    store: { name: 'House Perfume Paris', supportEmail: 'contact@houseperfume.com' },
    currency: { code: 'USD', symbol: '$' },
    shipping: { freeShippingThreshold: 150, standardShippingFee: 15 },
    tax: { enabled: false, rate: 0 },
    payment: {
      cod: { enabled: true },
      bankTransfer: {
        enabled: true,
        bankDetails: {
          bankName: 'Banque Nationale de Paris',
          accountName: 'House Perfume SAS',
          accountNumber: 'FR7630006000011234567890189',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === 'sec_admin') {
        return Promise.resolve({
          _id: 'sec_admin',
          email: 'admin@perfume.com',
          role: 'admin',
          status: 'active',
        });
      }
      if (id === 'sec_customer') {
        return Promise.resolve({
          _id: 'sec_customer',
          email: 'customer@perfume.com',
          role: 'customer',
          status: 'active',
        });
      }
      if (id === 'sec_suspended') {
        return Promise.resolve({
          _id: 'sec_suspended',
          email: 'suspended@perfume.com',
          role: 'admin',
          status: 'suspended',
        });
      }
      return Promise.resolve(null);
    });

    jest.spyOn(Settings, 'findOne').mockReturnValue({
      lean: jest.fn().mockResolvedValue(sampleSettings),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Authentication & JWT Hardening', () => {
    test('blocks access with malformed JWT token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer malformed.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid authentication token');
    });

    test('blocks access with expired JWT token with 401', async () => {
      const expiredToken = jwt.sign(
        { id: 'sec_admin', email: 'admin@perfume.com', role: 'admin' },
        env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expired');
    });

    test('blocks suspended accounts even with a valid signed JWT', async () => {
      const suspendedToken = jwt.sign(
        { id: 'sec_suspended', email: 'suspended@perfume.com', role: 'admin' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${suspendedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('suspended');
    });
  });

  describe('2. RBAC & IDOR Barriers', () => {
    test('blocks customer role from administrative user management with 403', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('blocks unauthenticated access to administrative order list with 401', async () => {
      const res = await request(app).get('/api/v1/orders');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('public confirmation endpoint only leaks customer-facing receipt fields', async () => {
      const mockOrder = {
        orderNumber: 'ORD-2026-PUBLIC01',
        orderStatus: 'confirmed',
        paymentStatus: 'pending',
        paymentMethod: 'cash_on_delivery',
        paymentInfo: { paymentMethod: 'Cash on Delivery' },
        items: [],
        subtotal: 350,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        total: 350,
        currency: 'USD',
        customerSnapshot: { name: 'Audited Customer', email: 'audit@example.com' },
        shippingAddress: { fullName: 'Audited Customer', city: 'Paris', country: 'FR' },
        createdAt: new Date(),
      };

      jest.spyOn(Order, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOrder),
        }),
      });

      const res = await request(app).get('/api/v1/orders/confirmation/ORD-2026-PUBLIC01');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBe('ORD-2026-PUBLIC01');
      expect(res.body.data.notes).toBeUndefined();
      expect(res.body.data.paymentVerification).toBeUndefined();
    });
  });

  describe('3. Checkout Integrity & Price Tampering Resistance', () => {
    test('strictly ignores client-supplied price, discount, and status manipulation', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue([]);
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);
      jest.spyOn(Customer, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      let createdOrderDoc = null;
      jest.spyOn(Order, 'create').mockImplementation((data) => {
        createdOrderDoc = { _id: new mongoose.Types.ObjectId(), ...data };
        return Promise.resolve(createdOrderDoc);
      });

      const tamperedPayload = {
        customer: { name: 'Hacker Joe', email: 'hacker@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'OUD-MYS-100', quantity: 1 }],
        shippingAddress: {
          fullName: 'Hacker Joe',
          phone: '+1 555-9999',
          addressLine1: '123 Darkweb Alley',
          city: 'Shadow City',
          state: 'NV',
          postalCode: '89101',
        },
        paymentMethod: 'cash_on_delivery',
        // Malicious client inputs:
        subtotal: 1,
        total: 1,
        discount: 99999,
        paymentStatus: 'paid',
        orderStatus: 'delivered',
      };

      const res = await request(app).post('/api/v1/orders').send(tamperedPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Server-side calculation must prevail:
      expect(res.body.data.subtotal).toBe(350);
      expect(res.body.data.total).toBe(350);
      expect(res.body.data.discount).toBe(0);
      expect(res.body.data.orderStatus).toBe('pending');
      expect(res.body.data.paymentStatus).toBe('pending');
    });

    test('rejects credit card or stripe payment methods with 400', async () => {
      const res = await request(app).post('/api/v1/orders').send({
        customer: { name: 'Test', email: 'test@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'OUD-MYS-100', quantity: 1 }],
        shippingAddress: {
          fullName: 'Test',
          phone: '123',
          addressLine1: 'Road',
          city: 'City',
          state: 'ST',
          postalCode: '12345',
        },
        paymentMethod: 'stripe',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Bank Transfer State Machine & Method Safety', () => {
    test('rejects payment approval on a Cash on Delivery order with 400', async () => {
      const codOrderId = new mongoose.Types.ObjectId().toString();
      const codOrder = {
        _id: codOrderId,
        orderNumber: 'ORD-2026-COD99',
        paymentMethod: 'cash_on_delivery',
        orderStatus: 'pending',
        paymentStatus: 'pending',
      };

      jest.spyOn(Order, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(codOrder),
        }),
      });

      const res = await request(app)
        .post(`/api/v1/orders/${codOrderId}/payment/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('only applicable for Bank Transfer');
    });

    test('rejects payment rejection on a Cash on Delivery order with 400', async () => {
      const codOrderId = new mongoose.Types.ObjectId().toString();
      const codOrder = {
        _id: codOrderId,
        orderNumber: 'ORD-2026-COD99',
        paymentMethod: 'cash_on_delivery',
        orderStatus: 'pending',
        paymentStatus: 'pending',
      };

      jest.spyOn(Order, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(codOrder),
        }),
      });

      const res = await request(app)
        .post(`/api/v1/orders/${codOrderId}/payment/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Invalid payment' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('only applicable for Bank Transfer');
    });
  });

  describe('5. Regex Injection & Search Input Sanitization', () => {
    test('safely handles special regex characters in search query without server error', async () => {
      const populateMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      populateMock.populate.mockReturnValue(populateMock);

      jest.spyOn(Product, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue(populateMock),
          }),
        }),
      });
      jest.spyOn(Product, 'countDocuments').mockResolvedValue(0);

      const maliciousQueries = [
        '.*',
        '([a-z]+)+$',
        '?',
        '++',
        '[[[',
        '\\',
      ];

      for (const query of maliciousQueries) {
        const res = await request(app).get(`/api/v1/products?search=${encodeURIComponent(query)}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });
  });
});
