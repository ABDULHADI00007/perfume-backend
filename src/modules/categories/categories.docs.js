/**
 * @openapi
 * tags:
 *   name: Categories
 *   description: Fragrance discovery taxonomy and category management
 *
 * /api/v1/categories:
 *   get:
 *     summary: Retrieve list of fragrance categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search category by name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status (admin only)
 *     responses:
 *       200:
 *         description: List of categories returned successfully
 *
 *   post:
 *     summary: Create a new fragrance category (Admin)
 *     tags: [Categories]
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Woody
 *               slug:
 *                 type: string
 *                 example: woody
 *               description:
 *                 type: string
 *                 example: Rich cedar, sandalwood, and oud accords
 *               sortOrder:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Category slug collision
 *
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Retrieve category details by ID or Slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category MongoDB ID or unique slug
 *     responses:
 *       200:
 *         description: Category returned successfully
 *       404:
 *         description: Category not found
 *
 *   put:
 *     summary: Update category by ID (Admin)
 *     tags: [Categories]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sortOrder:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *
 *   delete:
 *     summary: Delete category by ID (Admin)
 *     tags: [Categories]
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
 *         description: Category deleted successfully
 *
 * /api/v1/categories/{id}/archive:
 *   patch:
 *     summary: Archive/deactivate category (Admin)
 *     tags: [Categories]
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
 *         description: Category archived successfully
 */
module.exports = {};
