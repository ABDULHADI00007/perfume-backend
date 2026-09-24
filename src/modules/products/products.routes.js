const express = require('express');
const productsController = require('./products.controller');
const reviewsController = require('../reviews/reviews.controller');
const {
  createProductSchema,
  updateProductSchema,
  queryProductsSchema,
} = require('./products.validation');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

// Public Routes
router.get('/', validate(queryProductsSchema), productsController.getProducts);
router.get('/id/:id', productsController.getProductById);
router.get('/:productId/reviews', reviewsController.getReviewsForProduct);
router.get('/:slug', productsController.getProductBySlug);

// Admin Protected Routes
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(createProductSchema),
  productsController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(updateProductSchema),
  productsController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  productsController.archiveProduct
);

router.patch(
  '/:id/restore',
  authenticate,
  authorize(ROLES.ADMIN),
  productsController.restoreProduct
);

module.exports = router;
