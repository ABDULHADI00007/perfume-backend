const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const couponsService = require('./coupons.service');

const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal, customerEmail } = req.body;
  const result = await couponsService.validateCoupon(code, subtotal, customerEmail);
  return ApiResponse.success(res, 200, 'Coupon is valid and applicable', result);
});

const getCoupons = asyncHandler(async (req, res) => {
  const result = await couponsService.getCoupons(req.query);
  return ApiResponse.success(res, 200, 'Coupons fetched successfully', result.coupons, result.meta);
});

const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await couponsService.getCouponById(req.params.id);
  return ApiResponse.success(res, 200, 'Coupon fetched successfully', coupon);
});

const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponsService.createCoupon(req.body);
  return ApiResponse.created(res, 'Coupon created successfully', coupon);
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponsService.updateCoupon(req.params.id, req.body);
  return ApiResponse.success(res, 200, 'Coupon updated successfully', coupon);
});

const deactivateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponsService.deactivateCoupon(req.params.id);
  return ApiResponse.success(res, 200, 'Coupon deactivated successfully', coupon);
});

const deleteCoupon = asyncHandler(async (req, res) => {
  await couponsService.deleteCoupon(req.params.id);
  return ApiResponse.success(res, 200, 'Coupon deleted successfully');
});

module.exports = {
  validateCoupon,
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
  deleteCoupon,
};
