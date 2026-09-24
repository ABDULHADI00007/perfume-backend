/**
 * @openapi
 * tags:
 *   name: Coupons
 *   description: Promotional discount codes, validation, and usage management
 *
 * /api/v1/coupons/validate:
 *   post:
 *     summary: Validate coupon code during checkout (Public)
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - subtotal
 *             properties:
 *               code:
 *                 type: string
 *                 example: NOIR20
 *               subtotal:
 *                 type: number
 *                 example: 150
 *               customerEmail:
 *                 type: string
 *                 example: customer@example.com
 *     responses:
 *       200:
 *         description: Coupon is valid with discount details
 *       400:
 *         description: Invalid, expired, or inapplicable coupon
 *
 * /api/v1/coupons:
 *   get:
 *     summary: List all coupons (Admin)
 *     tags: [Coupons]
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
 *           enum: [active, inactive, expired]
 *     responses:
 *       200:
 *         description: List of coupons returned successfully
 *
 *   post:
 *     summary: Create new promotional coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *               - expiresAt
 *             properties:
 *               code:
 *                 type: string
 *                 example: SUMMER15
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 example: percentage
 *               discountValue:
 *                 type: number
 *                 example: 15
 *               minimumOrderAmount:
 *                 type: number
 *                 example: 80
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Coupon created successfully
 *
 * /api/v1/coupons/{id}:
 *   get:
 *     summary: Get coupon details by ID or Code (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon details returned
 *
 *   put:
 *     summary: Update coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *
 *   delete:
 *     summary: Delete coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 */
module.exports = {};
