const express = require('express');
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.get(
  '/dashboard',
  authenticate,
  authorize(ROLES.ADMIN),
  adminController.getDashboardOverview
);

module.exports = router;
