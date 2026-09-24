const express = require('express');
const reviewsController = require('./reviews.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  submitReviewSchema,
  moderateReviewSchema,
  reviewParamsSchema,
  productReviewParamsSchema,
} = require('./reviews.validation');

const router = express.Router();

// Public Routes
router.post('/', validate(submitReviewSchema), reviewsController.submitReview);
router.get('/product/:productId', validate(productReviewParamsSchema), reviewsController.getReviewsForProduct);

// Admin-Protected Routes
router.get(
  '/',
  authenticate,
  requirePermission('reviews.read'),
  reviewsController.getAdminReviews
);

router.patch(
  '/:id/status',
  authenticate,
  requirePermission('reviews.moderate'),
  validate(moderateReviewSchema),
  reviewsController.moderateReview
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('reviews.moderate'),
  validate(reviewParamsSchema),
  reviewsController.deleteReview
);

module.exports = router;
