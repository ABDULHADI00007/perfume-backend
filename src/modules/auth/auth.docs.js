/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate admin user and set secure HTTP-only cookie
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin@perfume.com"
 *               password:
 *                 type: string
 *                 example: "••••••••••••"
 *     responses:
 *       200:
 *         description: Successfully authenticated. HTTP-only session cookie is set.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "admin_token=abc123jwt; Path=/; HttpOnly; SameSite=Lax"
 *       401:
 *         description: Invalid email or password, or inactive account
 *
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out admin and clear session cookie
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Successfully logged out
 *
 * /api/v1/auth/me:
 *   get:
 *     summary: Retrieve currently authenticated admin profile
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user details
 *       401:
 *         description: Unauthenticated or expired session
 */
module.exports = {};
