const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const env = require('../../src/config/env');
const Product = require('../../src/modules/products/products.model');
const Order = require('../../src/modules/orders/orders.model');

const User = require('../../src/modules/users/users.model');

describe('Commerce APIs Authentication & Authorization Integration', () => {
  beforeEach(() => {
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === 'admin123') {
        return Promise.resolve({
          _id: 'admin123',
          email: 'admin@perfume.com',
          role: 'admin',
          status: 'active',
        });
      }
      if (id === 'cust123') {
        return Promise.resolve({
          _id: 'cust123',
          email: 'customer@perfume.com',
          role: 'customer',
          status: 'active',
        });
      }
      return Promise.resolve(null);
    });
  });

  const adminToken = jwt.sign(
    { id: 'admin123', email: 'admin@perfume.com', role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const customerToken = jwt.sign(
    { id: 'cust123', email: 'customer@perfume.com', role: 'customer' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  describe('Products Endpoints Security & Public Access', () => {
    test('GET /api/v1/products allows public access without authentication', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(Product, 'find').mockReturnValue(mockQuery);
      jest.spyOn(Product, 'countDocuments').mockResolvedValue(0);

      const res = await request(app).get('/api/v1/products');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('POST /api/v1/products blocks unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/v1/products').send({
        name: 'Forbidden Perfume',
        price: 120,
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('POST /api/v1/products blocks non-admin customer with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Forbidden Perfume',
          price: 120,
        });
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Inventory Endpoints Security', () => {
    test('GET /api/v1/inventory blocks unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/inventory');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('GET /api/v1/inventory blocks customer role with 403', async () => {
      const res = await request(app)
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Orders Public Confirmation & Protected Listing', () => {
    test('GET /api/v1/orders/confirmation/:orderNumber is accessible publicly', async () => {
      const mockOrder = {
        orderNumber: 'ORD-2026-CONFIRM01',
        orderStatus: 'confirmed',
        items: [],
        total: 150,
      };

      const selectMock = {
        lean: jest.fn().mockResolvedValue(mockOrder),
      };
      jest.spyOn(Order, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const res = await request(app).get('/api/v1/orders/confirmation/ORD-2026-CONFIRM01');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBe('ORD-2026-CONFIRM01');
    });

    test('GET /api/v1/orders admin list blocks unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/orders');
      expect(res.statusCode).toBe(401);
    });

    test('GET /api/v1/orders succeeds with valid admin token', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(Order, 'find').mockReturnValue(mockQuery);
      jest.spyOn(Order, 'countDocuments').mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
