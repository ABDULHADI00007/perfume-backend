const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const Category = require('../../src/modules/categories/categories.model');
const Collection = require('../../src/modules/collections/collections.model');
const Review = require('../../src/modules/reviews/reviews.model');
const Customer = require('../../src/modules/customers/customers.model');
const Coupon = require('../../src/modules/coupons/coupons.model');
const Blog = require('../../src/modules/blog/blog.model');
const Newsletter = require('../../src/modules/newsletter/newsletter.model');
const Settings = require('../../src/modules/settings/settings.model');

describe('Phase 5 Modules Integration & Security Suite', () => {
  const superadminToken = jwt.sign(
    { id: 'super1', email: 'super@perfume.com', role: 'superadmin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: 'admin1', email: 'admin@perfume.com', role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const staffToken = jwt.sign(
    { id: 'staff1', email: 'staff@perfume.com', role: 'staff' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === 'super1') {
        return Promise.resolve({
          _id: 'super1',
          email: 'super@perfume.com',
          role: 'superadmin',
          status: 'active',
        });
      }
      if (id === 'admin1') {
        return Promise.resolve({
          _id: 'admin1',
          email: 'admin@perfume.com',
          role: 'admin',
          status: 'active',
        });
      }
      if (id === 'staff1') {
        return Promise.resolve({
          _id: 'staff1',
          email: 'staff@perfume.com',
          role: 'staff',
          status: 'active',
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Categories APIs', () => {
    test('GET /api/v1/categories is publicly accessible', async () => {
      jest.spyOn(Category, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ name: 'Woody', status: 'active' }]),
        }),
      });

      const res = await request(app).get('/api/v1/categories');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    test('POST /api/v1/categories blocks unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/v1/categories').send({ name: 'Floral' });
      expect(res.statusCode).toBe(401);
    });

    test('POST /api/v1/categories allows admin with categories.manage permission', async () => {
      jest.spyOn(Category, 'findOne').mockResolvedValue(null);
      jest.spyOn(Category, 'create').mockResolvedValue({
        _id: 'cat123',
        name: 'Floral',
        slug: 'floral',
      });

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Floral' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Collections APIs', () => {
    test('GET /api/v1/collections is publicly accessible', async () => {
      jest.spyOn(Collection, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const res = await request(app).get('/api/v1/collections');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('POST /api/v1/collections blocks staff with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Summer Scents' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Reviews APIs', () => {
    test('POST /api/v1/reviews accepts customer review submission and ignores client verifiedPurchase', async () => {
      const productId = '507f1f77bcf86cd799439011';
      const ProductModel = require('../../src/modules/products/products.model');
      jest.spyOn(ProductModel, 'findById').mockResolvedValue({ _id: productId, name: 'Sample Scent' });
      const OrderModel = require('../../src/modules/orders/orders.model');
      jest.spyOn(OrderModel, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      let createdDoc = null;
      jest.spyOn(Review, 'create').mockImplementation((data) => {
        createdDoc = data;
        return Promise.resolve({ _id: 'rev1', ...data });
      });

      const res = await request(app).post('/api/v1/reviews').send({
        productId,
        customerName: 'Scent Collector',
        customerEmail: 'collector@example.com',
        rating: 5,
        comment: 'Mesmerizing opening notes with intense cedar base.',
        verifiedPurchase: true, // Malicious client attempt to forge verifiedPurchase
      });

      expect(res.statusCode).toBe(201);
      expect(createdDoc.verifiedPurchase).toBe(false); // Server denied client forgery
      expect(createdDoc.status).toBe('pending');
    });

    test('PATCH /api/v1/reviews/:id/status blocks unauthenticated requests with 401', async () => {
      const res = await request(app)
        .patch('/api/v1/reviews/507f1f77bcf86cd799439011/status')
        .send({ status: 'approved' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Customers APIs', () => {
    test('GET /api/v1/customers blocks unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/customers');
      expect(res.statusCode).toBe(401);
    });

    test('GET /api/v1/customers allows authorized admin with customers.read', async () => {
      jest.spyOn(Customer, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      jest.spyOn(Customer, 'countDocuments').mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Coupons APIs', () => {
    test('POST /api/v1/coupons/validate validates code for public checkout', async () => {
      const mockCoupon = {
        _id: 'coup1',
        code: 'WELCOME10',
        status: 'active',
        discountType: 'percentage',
        discountValue: 10,
        minimumOrderAmount: 50,
      };
      jest.spyOn(Coupon, 'findOne').mockResolvedValue(mockCoupon);

      const res = await request(app).post('/api/v1/coupons/validate').send({
        code: 'WELCOME10',
        subtotal: 100,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.discountAmount).toBe(10);
      expect(res.body.data.finalSubtotal).toBe(90);
    });
  });

  describe('Blog / Journal APIs', () => {
    test('GET /api/v1/journal is publicly accessible', async () => {
      jest.spyOn(Blog, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });
      jest.spyOn(Blog, 'countDocuments').mockResolvedValue(0);

      const res = await request(app).get('/api/v1/journal');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Newsletter APIs', () => {
    test('POST /api/v1/newsletter/subscribe accepts valid email and normalizes it', async () => {
      jest.spyOn(Newsletter, 'findOne').mockResolvedValue(null);
      jest.spyOn(Newsletter, 'create').mockImplementation((data) =>
        Promise.resolve({ _id: 'sub1', ...data })
      );

      const res = await request(app).post('/api/v1/newsletter/subscribe').send({
        email: 'Reader@FragranceJournal.Com',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('reader@fragrancejournal.com');
    });

    test('POST /api/v1/newsletter/subscribe rejects invalid email format with 400', async () => {
      const res = await request(app).post('/api/v1/newsletter/subscribe').send({
        email: 'invalid-email-address',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Settings APIs', () => {
    test('GET /api/v1/settings returns configuration without secrets', async () => {
      const mockSettings = {
        _id: 'set1',
        store: { name: 'House Perfume' },
        currency: { code: 'USD' },
        shipping: { flatRateFee: 15 },
        tax: { defaultTaxPercentage: 5 },
      };
      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSettings),
      });

      const res = await request(app).get('/api/v1/settings');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.store.name).toBe('House Perfume');
      expect(res.body.data.stripeSecretKey).toBeUndefined();
      expect(res.body.data.jwtSecret).toBeUndefined();
    });

    test('PUT /api/v1/settings blocks admin without settings.update permission (Superadmin only)', async () => {
      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ store: { name: 'New Brand Name' } });

      expect(res.statusCode).toBe(403);
    });

    test('PUT /api/v1/settings allows superadmin with universal permissions', async () => {
      const mockSettingsDoc = {
        store: { toObject: () => ({ name: 'House Perfume' }) },
        currency: { toObject: () => ({ code: 'USD' }) },
        shipping: { toObject: () => ({}) },
        tax: { toObject: () => ({}) },
        socialLinks: { toObject: () => ({}) },
        maintenanceMode: { toObject: () => ({ enabled: false }) },
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Settings, 'findOne').mockResolvedValue(mockSettingsDoc);
      const settingsService = require('../../src/modules/settings/settings.service');
      jest.spyOn(settingsService, 'getSettings').mockResolvedValue({
        store: { name: 'House Perfume Luxury' },
      });

      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ store: { name: 'House Perfume Luxury' } });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
