const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const ordersService = require('./orders.service');

/**
 * Public: Place a new order with automatic calculation & stock reservation
 */
const createOrder = asyncHandler(async (req, res) => {
  const userContext = req.user || null;
  const order = await ordersService.createOrder(req.body, userContext);
  return ApiResponse.created(res, 'Order placed successfully', order);
});

/**
 * Public: Retrieve order confirmation by order number
 */
const getOrderConfirmation = asyncHandler(async (req, res) => {
  const order = await ordersService.getOrderConfirmation(req.params.orderNumber);
  return ApiResponse.success(res, 200, 'Order confirmation fetched successfully', order);
});

/**
 * Public: Submit payment proof for Bank Transfer orders
 */
const submitPaymentProof = asyncHandler(async (req, res) => {
  const order = await ordersService.submitPaymentProof(req.params.orderNumberOrId, req.body);
  return ApiResponse.success(res, 200, 'Payment proof submitted successfully', order);
});

/**
 * Admin: Get paginated list of orders
 */
const getOrders = asyncHandler(async (req, res) => {
  const { orders, meta } = await ordersService.getOrders(req.query);
  return ApiResponse.success(res, 200, 'Orders list fetched successfully', orders, meta);
});

/**
 * Admin: Get single order by ID or order number
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await ordersService.getOrderById(req.params.id);
  return ApiResponse.success(res, 200, 'Order fetched successfully', order);
});

/**
 * Admin: Approve Bank Transfer payment
 */
const approvePayment = asyncHandler(async (req, res) => {
  const order = await ordersService.approveBankTransferPayment(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'Payment approved successfully', order);
});

/**
 * Admin: Reject Bank Transfer payment (releases inventory reservation)
 */
const rejectPayment = asyncHandler(async (req, res) => {
  const order = await ordersService.rejectBankTransferPayment(
    req.params.id,
    req.body.reason,
    req.user
  );
  return ApiResponse.success(res, 200, 'Payment rejected and inventory released successfully', order);
});

/**
 * Admin: Update order status with strict lifecycle rules
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const adminId = req.user?.email || req.user?.id || 'admin';
  const order = await ordersService.updateOrderStatus(
    req.params.id,
    req.body.status,
    req.body.notes,
    adminId
  );
  return ApiResponse.success(res, 200, 'Order status updated successfully', order);
});

/**
 * Admin: Cancel order and release reserved stock
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const adminId = req.user?.email || req.user?.id || 'admin';
  const order = await ordersService.cancelOrder(
    req.params.id,
    req.body?.reason,
    adminId
  );
  return ApiResponse.success(res, 200, 'Order cancelled successfully', order);
});

/**
 * Admin: Update shipping carrier and tracking details
 */
const updateShippingInfo = asyncHandler(async (req, res) => {
  const order = await ordersService.updateShippingInfo(req.params.id, req.body);
  return ApiResponse.success(res, 200, 'Shipping info updated successfully', order);
});

/**
 * Admin: Refund order
 */
const refundOrder = asyncHandler(async (req, res) => {
  const adminId = req.user?.email || req.user?.id || 'admin';
  const order = await ordersService.refundOrder(req.params.id, req.body, adminId);
  return ApiResponse.success(res, 200, 'Order refund processed successfully', order);
});

module.exports = {
  createOrder,
  getOrderConfirmation,
  submitPaymentProof,
  getOrders,
  getOrderById,
  approvePayment,
  rejectPayment,
  updateOrderStatus,
  cancelOrder,
  updateShippingInfo,
  refundOrder,
};
