/**
 * @openapi
 * tags:
 *   name: Newsletter
 *   description: Storefront newsletter subscriptions and subscriber management
 *
 * /api/v1/newsletter/subscribe:
 *   post:
 *     summary: Subscribe email to newsletter (Public)
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: fragrance.lover@example.com
 *               source:
 *                 type: string
 *                 example: footer_modal
 *     responses:
 *       200:
 *         description: Subscribed successfully (Idempotent)
 *       400:
 *         description: Invalid email format
 *
 * /api/v1/newsletter/unsubscribe:
 *   post:
 *     summary: Unsubscribe email from newsletter (Public)
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unsubscribed successfully
 *       404:
 *         description: Subscriber not found
 *
 * /api/v1/newsletter:
 *   get:
 *     summary: List all newsletter subscribers (Admin)
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [subscribed, unsubscribed]
 *     responses:
 *       200:
 *         description: Subscribers returned successfully
 *
 * /api/v1/newsletter/{id}/status:
 *   patch:
 *     summary: Update subscriber status (Admin)
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [subscribed, unsubscribed]
 *     responses:
 *       200:
 *         description: Status updated
 */
module.exports = {};
