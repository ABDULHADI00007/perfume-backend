const express = require('express');
const usersController = require('./users.controller');
const {
  createUserSchema,
  updateUserSchema,
  updateUserPasswordSchema,
  updateUserStatusSchema,
  queryUsersSchema,
} = require('./users.validation');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// All user management routes require authentication
router.use(authenticate);

router.get(
  '/',
  requirePermission('users.read'),
  validate(queryUsersSchema),
  usersController.getUsers
);

router.get(
  '/:id',
  requirePermission('users.read'),
  usersController.getUserById
);

router.post(
  '/',
  requirePermission('users.create'),
  validate(createUserSchema),
  usersController.createUser
);

router.patch(
  '/:id',
  requirePermission('users.update'),
  validate(updateUserSchema),
  usersController.updateUser
);

router.patch(
  '/:id/password',
  validate(updateUserPasswordSchema),
  usersController.updateUserPassword
);

router.patch(
  '/:id/status',
  requirePermission('users.delete'),
  validate(updateUserStatusSchema),
  usersController.updateUserStatus
);

module.exports = router;
