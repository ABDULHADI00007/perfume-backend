const express = require('express');
const couponsController = require('./coupons.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const { couponRateLimiter } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  couponParamsSchema,
} = require('./coupons.validation');

const router = express.Router();

// Public Checkout Validation Route with Dedicated Rate Limiting
router.post(
  '/validate',
  couponRateLimiter,
  validate(validateCouponSchema),
  couponsController.validateCoupon
);

// Admin-Protected Routes
router.use(authenticate);

router.get(
  '/',
  requirePermission('coupons.read'),
  couponsController.getCoupons
);

router.get(
  '/:id',
  requirePermission('coupons.read'),
  validate(couponParamsSchema),
  couponsController.getCouponById
);

router.post(
  '/',
  requirePermission('coupons.create'),
  validate(createCouponSchema),
  couponsController.createCoupon
);

router.put(
  '/:id',
  requirePermission('coupons.update'),
  validate(updateCouponSchema),
  couponsController.updateCoupon
);

router.patch(
  '/:id/status',
  requirePermission('coupons.update'),
  validate(couponParamsSchema),
  couponsController.deactivateCoupon
);

router.delete(
  '/:id',
  requirePermission('coupons.update'),
  validate(couponParamsSchema),
  couponsController.deleteCoupon
);

module.exports = router;
