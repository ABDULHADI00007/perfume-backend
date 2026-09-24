const express = require('express');
const settingsController = require('./settings.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const validate = require('../../middleware/validate.middleware');
const { updateSettingsSchema } = require('./settings.validation');

const router = express.Router();

// Public & Admin Read Route
router.get('/', settingsController.getSettings);

// Admin-Protected Settings Updates (Superadmin permission according to Phase 4 RBAC)
router.put(
  '/',
  authenticate,
  requirePermission('settings.update'),
  validate(updateSettingsSchema),
  settingsController.updateSettings
);

router.patch(
  '/',
  authenticate,
  requirePermission('settings.update'),
  validate(updateSettingsSchema),
  settingsController.updateSettings
);

module.exports = router;
