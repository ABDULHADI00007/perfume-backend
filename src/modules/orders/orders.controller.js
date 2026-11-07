const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const User = require('../users/users.model');
const { getAuthCookieName } = require('../../utils/cookie');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const ordersService = require('./orders.service');

/**
 * Resolves optional authenticated user from cookie or Bearer header without blocking
 */
const resolveCaller = async (req) => {
  if (req.user) return req.user;
  try {
    const cookieName = getAuthCookieName();
    let token = req.cookies?.[cookieName];
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return null;
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || !decoded.id) return null;
    const user = await User.findById(decoded.id);
    return user && user.status === 'active' ? user : null;
  } catch {
    return null;
  }
};

/**
 * Public: Place a new order with automatic calculation & stock reservation
 */
const createOrder = asyncHandler(async (req, res) => {
  const userContext = (await resolveCaller(req)) || req.user || null;
  const order = await ordersService.createOrder(req.body, userContext);
  return ApiResponse.created(res, 'Order placed successfully', order);
});

/**
 * Public: Retrieve order confirmation by order number
 * Requires valid orderAccessToken for guest access or authenticated ownership/admin role
 */
const getOrderConfirmation = asyncHandler(async (req, res) => {
  const token = req.query.token || req.headers['x-order-token'] || null;
  const user = await resolveCaller(req);
  const order = await ordersService.getOrderConfirmation(req.params.orderNumber, token, user);
  return ApiResponse.success(res, 200, 'Order confirmation fetched successfully', order);
});

/**
 * Public: Submit payment proof for Bank Transfer orders
 * Requires valid orderAccessToken or authenticated ownership/admin role
 */
const submitPaymentProof = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body?.token || req.headers['x-order-token'] || null;
  const user = await resolveCaller(req);
  const order = await ordersService.submitPaymentProof(
    req.params.orderNumberOrId,
    req.body,
    user,
    token
  );
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
 * Admin: Directly update order payment status
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await ordersService.updatePaymentStatus(
    req.params.id,
    req.body.paymentStatus,
    req.body.notes,
    req.user
  );
  return ApiResponse.success(res, 200, 'Payment status updated successfully', order);
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
  updatePaymentStatus,
  updateOrderStatus,
  cancelOrder,
  updateShippingInfo,
  refundOrder,
};
