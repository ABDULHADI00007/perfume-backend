const express = require('express');
const customersController = require('./customers.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  updateCustomerSchema,
  updateCustomerStatusSchema,
  customerParamsSchema,
} = require('./customers.validation');

const router = express.Router();

// Admin-Only Routes
router.use(authenticate);

router.get(
  '/',
  requirePermission('customers.read'),
  customersController.getCustomers
);

router.get(
  '/:id',
  requirePermission('customers.read'),
  validate(customerParamsSchema),
  customersController.getCustomerById
);

router.put(
  '/:id',
  requirePermission('customers.update'),
  validate(updateCustomerSchema),
  customersController.updateCustomer
);

router.patch(
  '/:id/status',
  requirePermission('customers.update'),
  validate(updateCustomerStatusSchema),
  customersController.updateCustomerStatus
);

module.exports = router;
