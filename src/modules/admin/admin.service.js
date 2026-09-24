/**
 * Admin Service Architecture Shell
 */
class AdminService {
  async getDashboardOverview() {
    return {
      totalSales: 0,
      totalOrders: 0,
      totalCustomers: 0,
      totalProducts: 0,
    };
  }
}

module.exports = new AdminService();
