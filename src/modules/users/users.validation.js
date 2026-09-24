const { z } = require('zod');
const { ROLES } = require('../../utils/constants');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password cannot exceed 100 characters'),
    role: z
      .enum([
        ROLES.SUPERADMIN,
        ROLES.ADMIN,
        ROLES.SCENT_SPECIALIST,
        ROLES.INVENTORY_MANAGER,
        ROLES.STAFF,
      ])
      .default(ROLES.STAFF),
    status: z.enum(['active', 'inactive', 'suspended']).optional().default('active'),
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid user ID format'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    role: z
      .enum([
        ROLES.SUPERADMIN,
        ROLES.ADMIN,
        ROLES.SCENT_SPECIALIST,
        ROLES.INVENTORY_MANAGER,
        ROLES.STAFF,
      ])
      .optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }),
});

const updateUserPasswordSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid user ID format'),
  }),
  body: z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});

const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid user ID format'),
  }),
  body: z.object({
    status: z.enum(['active', 'inactive', 'suspended']),
  }),
});

const queryUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z
      .enum([
        ROLES.SUPERADMIN,
        ROLES.ADMIN,
        ROLES.SCENT_SPECIALIST,
        ROLES.INVENTORY_MANAGER,
        ROLES.STAFF,
      ])
      .optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    search: z.string().optional(),
  }),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateUserPasswordSchema,
  updateUserStatusSchema,
  queryUsersSchema,
};
