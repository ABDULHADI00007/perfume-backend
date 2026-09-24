/**
 * @openapi
 * tags:
 *   name: Blog
 *   description: Editorial stories, fragrance journals, and article publishing
 *
 * /api/v1/journal:
 *   get:
 *     summary: Retrieve published journal articles (Public)
 *     tags: [Blog]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Journal articles returned successfully
 *
 * /api/v1/journal/{slug}:
 *   get:
 *     summary: Retrieve single published journal article by slug (Public)
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article returned successfully
 *       404:
 *         description: Article not found or unpublished
 *
 * /api/v1/blog:
 *   post:
 *     summary: Create a new editorial article (Admin)
 *     tags: [Blog]
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
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: The Art of Scent Layering
 *               excerpt:
 *                 type: string
 *               content:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *     responses:
 *       201:
 *         description: Article created successfully
 *
 * /api/v1/blog/admin/all:
 *   get:
 *     summary: List all articles including drafts (Admin)
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All articles returned
 *
 * /api/v1/blog/{id}/publish:
 *   patch:
 *     summary: Publish article (Admin)
 *     tags: [Blog]
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
 *         description: Article published successfully
 *
 * /api/v1/blog/{id}/unpublish:
 *   patch:
 *     summary: Unpublish article to draft (Admin)
 *     tags: [Blog]
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
 *         description: Article reverted to draft
 */
module.exports = {};
