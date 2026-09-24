const mongoose = require('mongoose');
const Customer = require('./customers.model');
const Order = require('../orders/orders.model');
const ApiError = require('../../utils/apiError');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

class CustomersService {
  /**
   * List customers with pagination, search, and status filters
   * @param {Object} query
   */
  async getCustomers(query = {}) {
    const { page, limit, skip, sort } = getPaginationOptions(query);
    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      const searchRegex = new RegExp(sanitized, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const [customers, totalItems] = await Promise.all([
      Customer.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);
    return { customers, meta };
  }

  /**
   * Get single customer by ID, including recent order history lookup
   * @param {string} id
   */
  async getCustomerById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid customer ID: ${id}`);
    }

    const customer = await Customer.findById(id).lean();
    if (!customer) {
      throw ApiError.notFound(`Customer with ID '${id}' not found`);
    }

    // Fetch related order records without embedding them directly in customer doc
    const recentOrders = await Order.find({ customer: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber orderStatus paymentStatus total createdAt items')
      .lean();

    return {
      ...customer,
      recentOrders,
    };
  }

  /**
   * Update customer allowed profile information
   * @param {string} id
   * @param {Object} updateData
   */
  async updateCustomer(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid customer ID: ${id}`);
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      throw ApiError.notFound(`Customer with ID '${id}' not found`);
    }

    if (updateData.firstName !== undefined) customer.firstName = updateData.firstName.trim();
    if (updateData.lastName !== undefined) customer.lastName = updateData.lastName.trim();
    if (updateData.phone !== undefined) customer.phone = updateData.phone?.trim();
    if (updateData.addresses !== undefined) customer.addresses = updateData.addresses;
    if (updateData.marketingPreferences !== undefined) {
      customer.marketingPreferences = {
        ...customer.marketingPreferences,
        ...updateData.marketingPreferences,
      };
    }
    if (updateData.status !== undefined) customer.status = updateData.status;

    await customer.save();
    return customer;
  }

  /**
   * Update customer account status (e.g. active, inactive, blocked)
   * @param {string} id
   * @param {string} status
   */
  async updateCustomerStatus(id, status) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid customer ID: ${id}`);
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      throw ApiError.notFound(`Customer with ID '${id}' not found`);
    }

    customer.status = status;
    await customer.save();
    return customer;
  }
}

module.exports = new CustomersService();
