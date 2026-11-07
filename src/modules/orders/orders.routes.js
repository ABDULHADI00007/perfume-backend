const express = require('express');
const ordersController = require('./orders.controller');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  updateShippingInfoSchema,
  cancelOrderSchema,
  refundOrderSchema,
  submitPaymentProofSchema,
  rejectPaymentSchema,
  queryOrdersSchema,
} = require('./orders.validation');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const { checkoutRateLimiter } = require('../../middleware/rateLimit.middleware');

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
  requirePermission('orders.read'),
  validate(queryOrdersSchema),
  ordersController.getOrders
);

router.get(
  '/:id',
  authenticate,
  requirePermission('orders.read'),
  ordersController.getOrderById
);

router.post(
  '/:id/payment/approve',
  authenticate,
  requirePermission('orders.update'),
  ordersController.approvePayment
);

router.post(
  '/:id/payment/reject',
  authenticate,
  requirePermission('orders.update'),
  validate(rejectPaymentSchema),
  ordersController.rejectPayment
);

router.patch(
  '/:id/payment-status',
  authenticate,
  requirePermission('orders.update'),
  validate(updatePaymentStatusSchema),
  ordersController.updatePaymentStatus
);

router.patch(
  '/:id/status',
  authenticate,
  requirePermission('orders.update'),
  validate(updateOrderStatusSchema),
  ordersController.updateOrderStatus
);

router.patch(
  '/:id/shipping',
  authenticate,
  requirePermission('orders.update'),
  validate(updateShippingInfoSchema),
  ordersController.updateShippingInfo
);

router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('orders.cancel'),
  validate(cancelOrderSchema),
  ordersController.cancelOrder
);

router.post(
  '/:id/refund',
  authenticate,
  requirePermission('orders.update'),
  validate(refundOrderSchema),
  ordersController.refundOrder
);

module.exports = router;
