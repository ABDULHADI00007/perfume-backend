const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const reviewsService = require('./reviews.service');

const submitReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.submitReview(req.body);
  return ApiResponse.created(
    res,
    'Review submitted successfully. It will be visible once approved by our moderation team.',
    review
  );
});

const getReviewsForProduct = asyncHandler(async (req, res) => {
  const result = await reviewsService.getReviewsForProduct(req.params.productId, req.query);
  return ApiResponse.success(res, 200, 'Product reviews fetched successfully', {
    reviews: result.reviews,
    summary: result.summary,
  }, result.meta);
});

const getAdminReviews = asyncHandler(async (req, res) => {
  const result = await reviewsService.getAdminReviews(req.query);
  return ApiResponse.success(res, 200, 'Reviews fetched successfully', result.reviews, result.meta);
});

const moderateReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.moderateReview(req.params.id, req.body.status);
  return ApiResponse.success(res, 200, `Review status updated to '${req.body.status}'`, review);
});

const deleteReview = asyncHandler(async (req, res) => {
  await reviewsService.deleteReview(req.params.id);
  return ApiResponse.success(res, 200, 'Review deleted successfully');
});

module.exports = {
  submitReview,
  getReviewsForProduct,
  getAdminReviews,
  moderateReview,
  deleteReview,
};
