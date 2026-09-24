const mongoose = require('mongoose');
const usersService = require('../../src/modules/users/users.service');
const User = require('../../src/modules/users/users.model');
const ApiError = require('../../src/utils/apiError');
const { ROLES } = require('../../src/utils/constants');

describe('User Management Service & Security Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Privilege Escalation Protection', () => {
    test('non-superadmin cannot create a superadmin user', async () => {
      const creator = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@perfume.com',
        role: ROLES.ADMIN,
      };

      await expect(
        usersService.createUser(
          {
            name: 'Malicious Superadmin',
            email: 'malicious@perfume.com',
            password: 'Password123!',
            role: ROLES.SUPERADMIN,
          },
          creator
        )
      ).rejects.toThrow(ApiError);
    });

    test('user cannot escalate their own role', async () => {
      const selfUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'staff@perfume.com',
        role: ROLES.STAFF,
        status: 'active',
        save: jest.fn(),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(selfUser);

      await expect(
        usersService.updateUser(
          selfUser._id.toString(),
          { role: ROLES.SUPERADMIN },
          selfUser
        )
      ).rejects.toThrow(ApiError);
    });

    test('non-superadmin cannot promote someone to superadmin', async () => {
      const targetUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'staff@perfume.com',
        role: ROLES.STAFF,
        status: 'active',
      };
      const adminActor = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@perfume.com',
        role: ROLES.ADMIN,
      };

      jest.spyOn(User, 'findById').mockResolvedValue(targetUser);

      await expect(
        usersService.updateUser(
          targetUser._id.toString(),
          { role: ROLES.SUPERADMIN },
          adminActor
        )
      ).rejects.toThrow(ApiError);
    });

    test('user cannot deactivate their own account', async () => {
      const selfUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@perfume.com',
        role: ROLES.ADMIN,
        status: 'active',
      };

      jest.spyOn(User, 'findById').mockResolvedValue(selfUser);

      await expect(
        usersService.updateUserStatus(selfUser._id.toString(), 'inactive', selfUser)
      ).rejects.toThrow(ApiError);
    });
  });

  describe('User Creation & Sanitization', () => {
    test('creates user and returns public sanitized output without password', async () => {
      const mockCreated = {
        _id: new mongoose.Types.ObjectId(),
        name: 'New Perfumer',
        email: 'perfumer@perfume.com',
        role: ROLES.SCENT_SPECIALIST,
        status: 'active',
        toPublicJSON: jest.fn().mockReturnValue({
          id: 'mock-id',
          name: 'New Perfumer',
          email: 'perfumer@perfume.com',
          role: ROLES.SCENT_SPECIALIST,
          status: 'active',
        }),
      };

      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'create').mockResolvedValue(mockCreated);

      const superadminActor = { role: ROLES.SUPERADMIN };
      const result = await usersService.createUser(
        {
          name: 'New Perfumer',
          email: 'perfumer@perfume.com',
          password: 'SecurePassword123!',
          role: ROLES.SCENT_SPECIALIST,
        },
        superadminActor
      );

      expect(result.email).toBe('perfumer@perfume.com');
      expect(result.password).toBeUndefined();
      expect(result.passwordHash).toBeUndefined();
    });
  });
});
