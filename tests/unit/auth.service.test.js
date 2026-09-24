const jwt = require('jsonwebtoken');
const authService = require('../../src/modules/auth/auth.service');
const User = require('../../src/modules/users/users.model');
const env = require('../../src/config/env');
const ApiError = require('../../src/utils/apiError');
const { ROLES } = require('../../src/utils/constants');

describe('Authentication Service Unit Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin Login Authentication', () => {
    test('authenticates valid credentials and generates signed JWT token', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Master Admin',
        email: 'admin@perfume.com',
        role: ROLES.ADMIN,
        status: 'active',
        comparePassword: jest.fn().mockResolvedValue(true),
        toPublicJSON: jest.fn().mockReturnValue({
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

      const result = await authService.loginUser({
        email: 'admin@perfume.com',
        password: 'ValidPassword123!',
      });

      expect(result.user.email).toBe('admin@perfume.com');
      expect(result.token).toBeDefined();

      const decoded = jwt.verify(result.token, env.JWT_SECRET);
      expect(decoded.id).toBe('507f1f77bcf86cd799439011');
      expect(decoded.role).toBe(ROLES.ADMIN);
      expect(mockUser.comparePassword).toHaveBeenCalledWith('ValidPassword123!');
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('rejects non-existent email with generic error message', async () => {
      const selectMock = {
        select: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(selectMock);

      await expect(
        authService.loginUser({
          email: 'unknown@perfume.com',
          password: 'SomePassword123!',
        })
      ).rejects.toThrow(ApiError);

      try {
        await authService.loginUser({
          email: 'unknown@perfume.com',
          password: 'SomePassword123!',
        });
      } catch (err) {
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe('Invalid email or password.');
      }
    });

    test('rejects incorrect password with generic error message', async () => {
      const mockUser = {
        email: 'admin@perfume.com',
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      const selectMock = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(selectMock);

      await expect(
        authService.loginUser({
          email: 'admin@perfume.com',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(ApiError);
    });

    test('rejects inactive or suspended user account', async () => {
      const mockUser = {
        email: 'suspended@perfume.com',
        status: 'suspended',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const selectMock = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      jest.spyOn(User, 'findOne').mockReturnValue(selectMock);

      await expect(
        authService.loginUser({
          email: 'suspended@perfume.com',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow(ApiError);
    });
  });
});
