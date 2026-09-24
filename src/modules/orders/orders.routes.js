const express = require('express');
const ordersController = require('./orders.controller');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  updateShippingInfoSchema,
  cancelOrderSchema,
  refundOrderSchema,
  submitPaymentProofSchema,
  rejectPaymentSchema,
  queryOrdersSchema,
} = require('./orders.validation');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const { checkoutRateLimiter } = require('../../middleware/rateLimit.middleware');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

// Public Storefront Endpoints
router.post('/', checkoutRateLimiter, validate(createOrderSchema), ordersController.createOrder);
router.get('/confirmation/:orderNumber', ordersController.getOrderConfirmation);
router.post(
  '/:orderNumberOrId/payment-proof',
  checkoutRateLimiter,
  validate(submitPaymentProofSchema),
  ordersController.submitPaymentProof
);

// Admin Order Management Endpoints (Protected)
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(queryOrdersSchema),
  ordersController.getOrders
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  ordersController.getOrderById
);

router.post(
  '/:id/payment/approve',
  authenticate,
  authorize(ROLES.ADMIN),
  ordersController.approvePayment
);

router.post(
  '/:id/payment/reject',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(rejectPaymentSchema),
  ordersController.rejectPayment
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(updateOrderStatusSchema),
  ordersController.updateOrderStatus
);

router.patch(
  '/:id/shipping',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(updateShippingInfoSchema),
  ordersController.updateShippingInfo
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(cancelOrderSchema),
  ordersController.cancelOrder
);

router.post(
  '/:id/refund',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(refundOrderSchema),
  ordersController.refundOrder
);

module.exports = router;
