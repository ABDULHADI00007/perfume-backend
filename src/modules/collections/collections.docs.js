/**
 * @openapi
 * tags:
 *   name: Collections
 *   description: Curated perfume edits and gift set collections
 *
 * /api/v1/collections:
 *   get:
 *     summary: Retrieve list of fragrance collections
 *     tags: [Collections]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         description: List of collections returned successfully
 *
 *   post:
 *     summary: Create a new fragrance collection (Admin)
 *     tags: [Collections]
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
 *                 example: Private Reserve
 *               slug:
 *                 type: string
 *                 example: private-reserve
 *               description:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: string
 *               sortOrder:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       201:
 *         description: Collection created successfully
 *
 * /api/v1/collections/{id}:
 *   get:
 *     summary: Retrieve collection details by ID or Slug
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection details returned
 *       404:
 *         description: Collection not found
 *
 *   put:
 *     summary: Update collection by ID (Admin)
 *     tags: [Collections]
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
 *         description: Collection updated successfully
 *
 *   delete:
 *     summary: Delete collection by ID (Admin)
 *     tags: [Collections]
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
 *         description: Collection deleted successfully
 */
module.exports = {};
