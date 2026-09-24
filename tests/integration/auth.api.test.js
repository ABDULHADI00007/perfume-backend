const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const { ROLES } = require('../../src/utils/constants');

describe('Admin Authentication & Session API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    test('successful login sets HttpOnly cookie and returns sanitized user', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Master Admin',
        email: 'admin@perfume.com',
        role: ROLES.ADMIN,
        status: 'active',
        comparePassword: jest.fn().mockResolvedValue(true),
        toPublicJSON: () => ({
          id: '507f1f77bcf86cd799439011',
          name: 'Master Admin',
          email: 'admin@perfume.com',
          role: ROLES.ADMIN,
          status: 'active',
        }),
        save: jest.fn().mockResolvedValue(true),
      };

      const selectMock = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(selectMock);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@perfume.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@perfume.com');
      expect(res.body.data.user.password).toBeUndefined();

      // Check Set-Cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c) => c.startsWith(`${env.AUTH_COOKIE_NAME || 'admin_token'}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
    });

    test('invalid login credentials return 401 with generic message', async () => {
      const selectMock = {
        select: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(selectMock);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@perfume.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    test('missing login fields return 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    test('clears authentication cookie on logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const clearedCookie = cookies.find((c) => c.startsWith(`${env.AUTH_COOKIE_NAME || 'admin_token'}=`));
      expect(clearedCookie).toContain('Expires=');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    test('returns current user profile with valid cookie token', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Master Admin',
        email: 'admin@perfume.com',
        role: ROLES.ADMIN,
        status: 'active',
        toPublicJSON: () => ({
          id: '507f1f77bcf86cd799439011',
          name: 'Master Admin',
          email: 'admin@perfume.com',
          role: ROLES.ADMIN,
          status: 'active',
        }),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const token = jwt.sign(
        { id: mockUser._id, role: mockUser.role },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const cookieName = env.AUTH_COOKIE_NAME || 'admin_token';
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`${cookieName}=${token}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@perfume.com');
    });

    test('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns 401 when token is tampered/invalid', async () => {
      const cookieName = env.AUTH_COOKIE_NAME || 'admin_token';
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`${cookieName}=invalid-token-string`]);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects JWT if user account became inactive in DB', async () => {
      const mockInactiveUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@perfume.com',
        role: ROLES.ADMIN,
        status: 'suspended',
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockInactiveUser);

      const token = jwt.sign(
        { id: mockInactiveUser._id, role: mockInactiveUser.role },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const cookieName = env.AUTH_COOKIE_NAME || 'admin_token';
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`${cookieName}=${token}`]);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('suspended');
    });
  });
});
