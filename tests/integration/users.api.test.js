const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const { ROLES } = require('../../src/utils/constants');

describe('User Management API Integration & RBAC', () => {
  const superadminId = '507f1f77bcf86cd799439001';
  const superadminUser = {
    _id: superadminId,
    name: 'Super Admin',
    email: 'superadmin@perfume.com',
    role: ROLES.SUPERADMIN,
    status: 'active',
  };

  const adminId = '507f1f77bcf86cd799439002';
  const adminUser = {
    _id: adminId,
    name: 'Standard Admin',
    email: 'admin@perfume.com',
    role: ROLES.ADMIN,
    status: 'active',
  };

  const staffId = '507f1f77bcf86cd799439003';
  const staffUser = {
    _id: staffId,
    name: 'Staff Member',
    email: 'staff@perfume.com',
    role: ROLES.STAFF,
    status: 'active',
  };

  const superadminToken = jwt.sign(
    { id: superadminId, role: ROLES.SUPERADMIN },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: adminId, role: ROLES.ADMIN },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const staffToken = jwt.sign(
    { id: staffId, role: ROLES.STAFF },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/users', () => {
    test('superadmin can list users', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(superadminUser);
      jest.spyOn(User, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { toPublicJSON: () => ({ email: 'test@perfume.com' }) },
        ]),
      });
      jest.spyOn(User, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('staff without users.read permission is blocked with 403', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(staffUser);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/users', () => {
    test('superadmin can create user', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(superadminUser);
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'create').mockResolvedValue({
        name: 'New Staff',
        email: 'newstaff@perfume.com',
        role: ROLES.STAFF,
        status: 'active',
        toPublicJSON: () => ({ email: 'newstaff@perfume.com', role: ROLES.STAFF }),
      });

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'New Staff',
          email: 'newstaff@perfume.com',
          password: 'Password123!',
          role: ROLES.STAFF,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('standard admin cannot create users (requires users.create)', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Admin',
          email: 'newadmin@perfume.com',
          password: 'Password123!',
          role: ROLES.ADMIN,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Permission denied');
    });
  });
});
