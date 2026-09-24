const express = require('express');
const collectionsController = require('./collections.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  createCollectionSchema,
  updateCollectionSchema,
  collectionParamsSchema,
} = require('./collections.validation');

const router = express.Router();

// Public Routes
router.get('/', collectionsController.getCollections);
router.get('/:id', validate(collectionParamsSchema), collectionsController.getCollectionByIdOrSlug);

// Admin-Protected Routes
router.post(
  '/',
  authenticate,
  requirePermission('collections.manage'),
  validate(createCollectionSchema),
  collectionsController.createCollection
);

router.put(
  '/:id',
  authenticate,
  requirePermission('collections.manage'),
  validate(updateCollectionSchema),
  collectionsController.updateCollection
);

router.patch(
  '/:id/archive',
  authenticate,
  requirePermission('collections.manage'),
  validate(collectionParamsSchema),
  collectionsController.archiveCollection
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('collections.manage'),
  validate(collectionParamsSchema),
  collectionsController.deleteCollection
);

module.exports = router;
