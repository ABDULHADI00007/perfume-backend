const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const Category = require('../../src/modules/categories/categories.model');
const Collection = require('../../src/modules/collections/collections.model');
const Blog = require('../../src/modules/blog/blog.model');
const Product = require('../../src/modules/products/products.model');
const Newsletter = require('../../src/modules/newsletter/newsletter.model');
const Settings = require('../../src/modules/settings/settings.model');

describe('Runtime Production Smoke Test Suite', () => {
  const adminToken = jwt.sign(
    { id: 'admin_smoke', email: 'admin@perfume.com', role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === 'admin_smoke') {
        return Promise.resolve({
          _id: 'admin_smoke',
          email: 'admin@perfume.com',
          role: 'admin',
          status: 'active',
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. GET /api/v1/health returns 200 and operational status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('healthy');
  });

  test('2. GET /api/docs/ returns 200 Swagger HTML documentation', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('swagger');
  });

  test('3. GET /api/v1/auth/me returns 200 with authenticated admin token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@perfume.com');
  });

  test('4. GET /api/v1/products returns 200 public products catalog', async () => {
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

    const res = await request(app).get('/api/v1/products');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('5. GET /api/v1/categories returns 200 public active categories', async () => {
    jest.spyOn(Category, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ name: 'Woody', slug: 'woody', status: 'active' }]),
      }),
    });

    const res = await request(app).get('/api/v1/categories');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].name).toBe('Woody');
  });

  test('6. GET /api/v1/collections returns 200 public active collections', async () => {
    jest.spyOn(Collection, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ name: 'Private Reserve', slug: 'private-reserve' }]),
        }),
      }),
    });

    const res = await request(app).get('/api/v1/collections');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].name).toBe('Private Reserve');
  });

  test('7. GET /api/v1/journal returns 200 public editorial articles', async () => {
    jest.spyOn(Blog, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ title: 'Art of Perfumery', status: 'published' }]),
              }),
            }),
          }),
        }),
      }),
    });
    jest.spyOn(Blog, 'countDocuments').mockResolvedValue(1);

    const res = await request(app).get('/api/v1/journal');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('8. POST /api/v1/newsletter/subscribe accepts public email signup', async () => {
    jest.spyOn(Newsletter, 'findOne').mockResolvedValue(null);
    jest.spyOn(Newsletter, 'create').mockResolvedValue({
      email: 'smoke@perfume.com',
      status: 'subscribed',
    });

    const res = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'smoke@perfume.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('9. GET /api/v1/settings returns 200 store config without secrets', async () => {
    jest.spyOn(Settings, 'findOne').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        store: { name: 'House Perfume' },
        currency: { code: 'USD' },
      }),
    });

    const res = await request(app).get('/api/v1/settings');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.store.name).toBe('House Perfume');
    expect(res.body.data.jwtSecret).toBeUndefined();
  });

  test('10. GET /api/v1/customers protected admin endpoint works with RBAC', async () => {
    const Customer = require('../../src/modules/customers/customers.model');
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
