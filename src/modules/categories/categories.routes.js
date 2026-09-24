const express = require('express');
const categoriesController = require('./categories.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  createCategorySchema,
  updateCategorySchema,
  categoryParamsSchema,
} = require('./categories.validation');

const router = express.Router();

// Public Routes
router.get('/', categoriesController.getCategories);
router.get('/:id', validate(categoryParamsSchema), categoriesController.getCategoryByIdOrSlug);

// Admin-Protected Routes
router.post(
  '/',
  authenticate,
  requirePermission('categories.manage'),
  validate(createCategorySchema),
  categoriesController.createCategory
);

router.put(
  '/:id',
  authenticate,
  requirePermission('categories.manage'),
  validate(updateCategorySchema),
  categoriesController.updateCategory
);

router.patch(
  '/:id/archive',
  authenticate,
  requirePermission('categories.manage'),
  validate(categoryParamsSchema),
  categoriesController.archiveCategory
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('categories.manage'),
  validate(categoryParamsSchema),
  categoriesController.deleteCategory
);

module.exports = router;
