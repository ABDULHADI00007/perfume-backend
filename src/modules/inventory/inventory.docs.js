/**
 * @openapi
 * components:
 *   schemas:
 *     Inventory:
 *       type: object
 *       required:
 *         - product
 *         - variantSku
 *         - quantity
 *       properties:
 *         _id:
 *           type: string
 *         product:
 *           type: string
 *         variantSku:
 *           type: string
 *           example: "OUD-ROY-100"
 *         size:
 *           type: string
 *           example: "100ml"
 *         quantity:
 *           type: number
 *           example: 50
 *         reservedQuantity:
 *           type: number
 *           example: 2
 *         availableQuantity:
 *           type: number
 *           example: 48
 *         lowStockThreshold:
 *           type: number
 *           example: 5
 *         status:
 *           type: string
 *           enum: [in_stock, low_stock, out_of_stock]
 *
 * /api/v1/inventory:
 *   get:
 *     summary: Retrieve inventory status with pagination & filtering (Admin only)
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_stock, low_stock, out_of_stock]
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: string
 *           enum: [true, false]
 *     responses:
 *       200:
 *         description: List of inventory records
 *   post:
 *     summary: Create an inventory record for a product SKU (Admin only)
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product
 *               - variantSku
 *               - quantity
 *             properties:
 *               product:
 *                 type: string
 *               variantSku:
 *                 type: string
 *               size:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Inventory created
 *
 * /api/v1/inventory/adjust:
 *   post:
 *     summary: Adjust inventory stock (+/- quantity) with audit log (Admin only)
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - variantSku
 *               - adjustment
 *               - reason
 *             properties:
 *               variantSku:
 *                 type: string
 *               adjustment:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 */
module.exports = {};
