const express = require('express');
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.get(
  '/dashboard',
  authenticate,
  authorize(
    ROLES.SUPERADMIN,
    ROLES.ADMIN,
    ROLES.SCENT_SPECIALIST,
    ROLES.INVENTORY_MANAGER,
    ROLES.STAFF
  ),
  adminController.getDashboardOverview
);

module.exports = router;
