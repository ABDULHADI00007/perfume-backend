const express = require('express');
const blogController = require('./blog.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  createPostSchema,
  updatePostSchema,
  postParamsSchema,
  postSlugParamsSchema,
} = require('./blog.validation');

const router = express.Router();

// Public Journal Editorial Routes
router.get('/', blogController.getPublishedPosts);
router.get('/journal', blogController.getPublishedPosts);
router.get('/journal/:slug', validate(postSlugParamsSchema), blogController.getPublishedPostBySlug);

// Admin-Protected Routes
router.get(
  '/admin/all',
  authenticate,
  requirePermission('blog.manage'),
  blogController.getAdminPosts
);

router.get(
  '/admin/:id',
  authenticate,
  requirePermission('blog.manage'),
  validate(postParamsSchema),
  blogController.getPostById
);

router.post(
  '/',
  authenticate,
  requirePermission('blog.manage'),
  validate(createPostSchema),
  blogController.createPost
);

router.put(
  '/:id',
  authenticate,
  requirePermission('blog.manage'),
  validate(updatePostSchema),
  blogController.updatePost
);

router.patch(
  '/:id/publish',
  authenticate,
  requirePermission('blog.manage'),
  validate(postParamsSchema),
  blogController.publishPost
);

router.patch(
  '/:id/unpublish',
  authenticate,
  requirePermission('blog.manage'),
  validate(postParamsSchema),
  blogController.unpublishPost
);

router.patch(
  '/:id/archive',
  authenticate,
  requirePermission('blog.manage'),
  validate(postParamsSchema),
  blogController.archivePost
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('blog.manage'),
  validate(postParamsSchema),
  blogController.deletePost
);

// Public Slug Resolution (fallback after admin routes)
router.get('/:slug', validate(postSlugParamsSchema), blogController.getPublishedPostBySlug);

module.exports = router;
