/**
 * @openapi
 * components:
 *   schemas:
 *     ProductImage:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           example: "https://images.unsplash.com/photo-1541643600914-78b084683601"
 *         altText:
 *           type: string
 *           example: "Oud Royale bottle shot"
 *         isPrimary:
 *           type: boolean
 *           default: false
 *     ProductVariant:
 *       type: object
 *       required:
 *         - size
 *         - price
 *         - sku
 *       properties:
 *         size:
 *           type: string
 *           example: "100ml"
 *         price:
 *           type: number
 *           example: 240
 *         compareAtPrice:
 *           type: number
 *           example: 280
 *         sku:
 *           type: string
 *           example: "OUD-ROY-100"
 *         stock:
 *           type: number
 *           default: 50
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *         - sku
 *         - price
 *         - category
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           example: "Oud Royale Extrait"
 *         slug:
 *           type: string
 *           example: "oud-royale-extrait"
 *         brand:
 *           type: string
 *           example: "House Perfume"
 *         sku:
 *           type: string
 *           example: "OUD-ROYALE"
 *         status:
 *           type: string
 *           enum: [active, draft, archived]
 *         price:
 *           type: number
 *           example: 240
 *         compareAtPrice:
 *           type: number
 *           example: 280
 *         category:
 *           type: string
 *         fragrance:
 *           type: object
 *           properties:
 *             concentration:
 *               type: string
 *               example: "Extrait de Parfum"
 *             gender:
 *               type: string
 *               example: "Unisex"
 *             topNotes:
 *               type: array
 *               items:
 *                 type: string
 *             heartNotes:
 *               type: array
 *               items:
 *                 type: string
 *             baseNotes:
 *               type: array
 *               items:
 *                 type: string
 *         scentFamily:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Woody", "Oriental"]
 *         variants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductVariant'
 *
 * /api/v1/products:
 *   get:
 *     summary: Retrieve list of products with filters, sorting, search, and pagination
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: "price_asc"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: scentFamily
 *         schema:
 *           type: string
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [Men, Women, Unisex]
 *     responses:
 *       200:
 *         description: Paginated catalog of products
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *
 * /api/v1/products/{slug}:
 *   get:
 *     summary: Retrieve active product details by slug
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 *
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product by ID (Admin only)
 *     tags:
 *       - Products
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
 *         description: Product updated successfully
 *   delete:
 *     summary: Archive product by ID (Admin only)
 *     tags:
 *       - Products
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
 *         description: Product archived successfully
 */
module.exports = {};
