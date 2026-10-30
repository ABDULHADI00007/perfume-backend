const Order = require('../orders/orders.model');
const Customer = require('../customers/customers.model');
const Product = require('../products/products.model');

/**
 * Admin Service Architecture
 */
class AdminService {
  async getDashboardOverview() {
    const [salesResult, totalOrders, totalCustomers, totalProducts] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            orderStatus: { $nin: ['cancelled', 'payment_rejected', 'refunded'] },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ['$total', { $ifNull: ['$totalAmount', 0] }],
              },
            },
          },
        },
      ]),
      Order.countDocuments({ orderStatus: { $nin: ['cancelled', 'payment_rejected'] } }),
      Customer.countDocuments(),
      Product.countDocuments({ status: { $ne: 'archived' } }),
    ]);

    const totalSales = Number(salesResult[0]?.total) || 0;

    return {
      totalSales,
      totalOrders,
      totalCustomers,
      totalProducts,
    };
  }
}

module.exports = new AdminService();
