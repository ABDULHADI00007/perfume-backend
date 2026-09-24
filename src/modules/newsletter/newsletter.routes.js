const express = require('express');
const newsletterController = require('./newsletter.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const { newsletterRateLimiter } = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  subscribeNewsletterSchema,
  unsubscribeNewsletterSchema,
  updateSubscriberStatusSchema,
  subscriberParamsSchema,
} = require('./newsletter.validation');

const router = express.Router();

// Public Subscription Endpoints
router.post(
  '/subscribe',
  newsletterRateLimiter,
  validate(subscribeNewsletterSchema),
  newsletterController.subscribe
);
router.post('/unsubscribe', validate(unsubscribeNewsletterSchema), newsletterController.unsubscribe);

// Admin-Protected Subscriber Management
router.get(
  '/',
  authenticate,
  requirePermission('newsletter.manage'),
  newsletterController.getSubscribers
);

router.patch(
  '/:id/status',
  authenticate,
  requirePermission('newsletter.manage'),
  validate(updateSubscriberStatusSchema),
  newsletterController.updateSubscriberStatus
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('newsletter.manage'),
  validate(subscriberParamsSchema),
  newsletterController.deleteSubscriber
);

module.exports = router;
