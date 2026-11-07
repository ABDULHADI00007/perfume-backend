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
const { requirePermission } = require('../../middleware/permission.middleware');

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
  requirePermission('products.create'),
  validate(createProductSchema),
  productsController.createProduct
);

router.put(
  '/:id',
  authenticate,
  requirePermission('products.update'),
  validate(updateProductSchema),
  productsController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('products.archive'),
  productsController.archiveProduct
);

router.patch(
  '/:id/restore',
  authenticate,
  requirePermission('products.archive'),
  productsController.restoreProduct
);

module.exports = router;
