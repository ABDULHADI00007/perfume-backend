/**
 * @openapi
 * tags:
 *   name: Customers
 *   description: Storefront customer records and internal CRM management
 *
 * /api/v1/customers:
 *   get:
 *     summary: List customer records with search and pagination (Admin)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, blocked]
 *     responses:
 *       200:
 *         description: Customers list returned successfully
 *
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Retrieve customer details and order history summary (Admin)
 *     tags: [Customers]
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
 *         description: Customer details returned
 *       404:
 *         description: Customer not found
 *
 *   put:
 *     summary: Update customer profile information (Admin)
 *     tags: [Customers]
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
 *         description: Customer updated successfully
 *
 * /api/v1/customers/{id}/status:
 *   patch:
 *     summary: Update customer status (Admin)
 *     tags: [Customers]
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
 *                 enum: [active, inactive, blocked]
 *     responses:
 *       200:
 *         description: Customer status updated
 */
module.exports = {};
