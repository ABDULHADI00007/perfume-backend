const express = require('express');

const adminRoutes = require('../modules/admin/admin.routes');
const authRoutes = require('../modules/auth/auth.routes');
const usersRoutes = require('../modules/users/users.routes');
const productsRoutes = require('../modules/products/products.routes');
const categoriesRoutes = require('../modules/categories/categories.routes');
const collectionsRoutes = require('../modules/collections/collections.routes');
const ordersRoutes = require('../modules/orders/orders.routes');
const customersRoutes = require('../modules/customers/customers.routes');
const reviewsRoutes = require('../modules/reviews/reviews.routes');
const couponsRoutes = require('../modules/coupons/coupons.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const blogRoutes = require('../modules/blog/blog.routes');
const newsletterRoutes = require('../modules/newsletter/newsletter.routes');
const settingsRoutes = require('../modules/settings/settings.routes');

const router = express.Router();

/**
 * Health Check Endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Perfume API v1 is healthy and operational',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Register Domain Modules Under /api/v1
 */
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/collections', collectionsRoutes);
router.use('/orders', ordersRoutes);
router.use('/customers', customersRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/coupons', couponsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/blog', blogRoutes);
router.use('/journal', blogRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
