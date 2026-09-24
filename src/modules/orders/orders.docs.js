/**
 * @openapi
 * components:
 *   schemas:
 *     OrderItemSnapshot:
 *       type: object
 *       properties:
 *         product:
 *           type: string
 *         name:
 *           type: string
 *           example: "Oud Royale Extrait"
 *         sku:
 *           type: string
 *           example: "OUD-ROY-100"
 *         size:
 *           type: string
 *           example: "100ml"
 *         quantity:
 *           type: integer
 *           example: 1
 *         unitPrice:
 *           type: number
 *           example: 240
 *         totalPrice:
 *           type: number
 *           example: 240
 *     PaymentProof:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           example: "https://storage.example.com/proofs/transfer_123.jpg"
 *         storageKey:
 *           type: string
 *         originalName:
 *           type: string
 *         mimeType:
 *           type: string
 *           example: "image/jpeg"
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *     PaymentVerification:
 *       type: object
 *       properties:
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *         verifiedBy:
 *           type: string
 *         rejectionReason:
 *           type: string
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         orderNumber:
 *           type: string
 *           example: "ORD-2026-A1B2C3"
 *         orderStatus:
 *           type: string
 *           enum: [pending, awaiting_payment_verification, confirmed, processing, shipped, delivered, cancelled, refunded, payment_rejected]
 *         paymentStatus:
 *           type: string
 *           enum: [pending, pending_verification, paid, rejected, failed, refunded, partially_refunded]
 *         paymentMethod:
 *           type: string
 *           enum: [cash_on_delivery, bank_transfer]
 *         subtotal:
 *           type: number
 *           example: 240
 *         discount:
 *           type: number
 *           example: 0
 *         shippingFee:
 *           type: number
 *           example: 0
 *         tax:
 *           type: number
 *           example: 0
 *         total:
 *           type: number
 *           example: 240
 *         paymentProof:
 *           $ref: '#/components/schemas/PaymentProof'
 *         paymentVerification:
 *           $ref: '#/components/schemas/PaymentVerification'
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItemSnapshot'
 *
 * /api/v1/orders:
 *   post:
 *     summary: Place a new order (Public Checkout)
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer
 *               - items
 *               - shippingAddress
 *             properties:
 *               customer:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     sku:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               shippingAddress:
 *                 type: object
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash_on_delivery, bank_transfer]
 *               idempotencyKey:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *   get:
 *     summary: List all orders with filters & pagination (Admin only)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated orders list
 *
 * /api/v1/orders/{orderNumberOrId}/payment-proof:
 *   post:
 *     summary: Submit payment proof for Bank Transfer order (Public)
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: orderNumberOrId
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
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *               storageKey:
 *                 type: string
 *               originalName:
 *                 type: string
 *               mimeType:
 *                 type: string
 *                 enum: [image/jpeg, image/png, image/webp, application/pdf]
 *     responses:
 *       200:
 *         description: Payment proof submitted
 *
 * /api/v1/orders/{id}/payment/approve:
 *   post:
 *     summary: Approve bank transfer payment (Admin only)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment approved
 *
 * /api/v1/orders/{id}/payment/reject:
 *   post:
 *     summary: Reject bank transfer payment & release inventory (Admin only)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment rejected and stock released
 *
 * /api/v1/orders/confirmation/{orderNumber}:
 *   get:
 *     summary: Retrieve public order confirmation details
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order confirmation details
 *
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Update order lifecycle status (Admin only)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [pending, awaiting_payment_verification, confirmed, processing, shipped, delivered, cancelled, refunded, payment_rejected]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 *
 * /api/v1/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order & release stock (Admin only)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order cancelled
 */
module.exports = {};
