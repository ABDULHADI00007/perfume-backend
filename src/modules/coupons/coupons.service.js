const mongoose = require('mongoose');
const Coupon = require('./coupons.model');
const Order = require('../orders/orders.model');
const ApiError = require('../../utils/apiError');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

class CouponsService {
  /**
   * Validate coupon and calculate server-side discount amount
   * @param {string} rawCode
   * @param {number} subtotal
   * @param {string} customerEmail
   */
  async validateCoupon(rawCode, subtotal, customerEmail = null) {
    if (!rawCode || !rawCode.trim()) {
      throw ApiError.badRequest('Coupon code is required');
    }

    const code = rawCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      throw ApiError.badRequest(`Coupon code '${code}' is invalid`);
    }

    const now = new Date();

    if (coupon.status !== 'active') {
      throw ApiError.badRequest(`Coupon '${code}' is inactive`);
    }

    if (coupon.startsAt && coupon.startsAt > now) {
      throw ApiError.badRequest(`Coupon '${code}' is not yet active`);
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw ApiError.badRequest(`Coupon '${code}' has expired`);
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw ApiError.badRequest(`Coupon '${code}' usage limit has been reached`);
    }

    if (coupon.minimumOrderAmount && subtotal < coupon.minimumOrderAmount) {
      throw ApiError.badRequest(
        `Coupon '${code}' requires a minimum subtotal of $${coupon.minimumOrderAmount}`
      );
    }

    // Check per-customer usage if email is provided
    if (customerEmail && coupon.perCustomerLimit) {
      const emailNormalized = customerEmail.toLowerCase().trim();
      const customerUses = await Order.countDocuments({
        couponCode: code,
        'customerSnapshot.email': emailNormalized,
        orderStatus: { $ne: 'cancelled' },
      });

      if (customerUses >= coupon.perCustomerLimit) {
        throw ApiError.badRequest(
          `You have already reached the maximum usage limit (${coupon.perCustomerLimit}) for coupon '${code}'`
        );
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maximumDiscountAmount && discountAmount > coupon.maximumDiscountAmount) {
        discountAmount = coupon.maximumDiscountAmount;
      }
    } else if (coupon.discountType === 'fixed') {
      discountAmount = Math.min(subtotal, coupon.discountValue);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalSubtotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    return {
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
      subtotal,
      discountAmount,
      finalSubtotal,
    };
  }

  /**
   * Concurrency-safe atomic usage increment
   * @param {string|ObjectId} couponId
   */
  async incrementUsageSafely(couponId) {
    const updated = await Coupon.findOneAndUpdate(
      {
        _id: couponId,
        status: 'active',
        $or: [
          { usageLimit: { $exists: false } },
          { usageLimit: null },
          { $expr: { $lt: ['$usageCount', '$usageLimit'] } },
        ],
      },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!updated) {
      throw ApiError.badRequest('Coupon usage limit reached or coupon became inactive');
    }

    return updated;
  }

  /**
   * Admin: Create a new coupon
   * @param {Object} couponData
   */
  async createCoupon(couponData) {
    const code = couponData.code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code });
    if (existing) {
      throw ApiError.conflict(`Coupon with code '${code}' already exists`);
    }

    if (couponData.startsAt && couponData.expiresAt) {
      if (new Date(couponData.startsAt) >= new Date(couponData.expiresAt)) {
        throw ApiError.badRequest('Coupon start date must be before expiration date');
      }
    }

    const coupon = await Coupon.create({
      ...couponData,
      code,
    });

    return coupon;
  }

  /**
   * Admin: List coupons with pagination and search
   * @param {Object} query
   */
  async getCoupons(query = {}) {
    const { page, limit, skip, sort } = getPaginationOptions(query);
    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.discountType) {
      filter.discountType = query.discountType;
    }
    if (query.search && query.search.trim()) {
      filter.code = { $regex: escapeRegex(query.search.trim().toUpperCase()), $options: 'i' };
    }

    const [coupons, totalItems] = await Promise.all([
      Coupon.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);
    return { coupons, meta };
  }

  /**
   * Admin: Get coupon by ID or code
   * @param {string} idOrCode
   */
  async getCouponById(idOrCode) {
    const query = mongoose.Types.ObjectId.isValid(idOrCode)
      ? { _id: idOrCode }
      : { code: idOrCode.trim().toUpperCase() };

    const coupon = await Coupon.findOne(query).lean();
    if (!coupon) {
      throw ApiError.notFound(`Coupon '${idOrCode}' not found`);
    }

    return coupon;
  }

  /**
   * Admin: Update coupon
   * @param {string} id
   * @param {Object} updateData
   */
  async updateCoupon(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid coupon ID: ${id}`);
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw ApiError.notFound(`Coupon with ID '${id}' not found`);
    }

    if (updateData.code) {
      const newCode = updateData.code.trim().toUpperCase();
      if (newCode !== coupon.code) {
        const codeExists = await Coupon.findOne({ code: newCode, _id: { $ne: id } });
        if (codeExists) {
          throw ApiError.conflict(`Coupon with code '${newCode}' already exists`);
        }
        coupon.code = newCode;
      }
    }

    if (updateData.description !== undefined) coupon.description = updateData.description;
    if (updateData.discountType !== undefined) coupon.discountType = updateData.discountType;
    if (updateData.discountValue !== undefined) coupon.discountValue = updateData.discountValue;
    if (updateData.minimumOrderAmount !== undefined) coupon.minimumOrderAmount = updateData.minimumOrderAmount;
    if (updateData.maximumDiscountAmount !== undefined) coupon.maximumDiscountAmount = updateData.maximumDiscountAmount;
    if (updateData.usageLimit !== undefined) coupon.usageLimit = updateData.usageLimit;
    if (updateData.perCustomerLimit !== undefined) coupon.perCustomerLimit = updateData.perCustomerLimit;
    if (updateData.startsAt !== undefined) coupon.startsAt = updateData.startsAt;
    if (updateData.expiresAt !== undefined) coupon.expiresAt = updateData.expiresAt;
    if (updateData.applicableProducts !== undefined) coupon.applicableProducts = updateData.applicableProducts;
    if (updateData.applicableCategories !== undefined) coupon.applicableCategories = updateData.applicableCategories;
    if (updateData.status !== undefined) coupon.status = updateData.status;

    await coupon.save();
    return coupon;
  }

  /**
   * Admin: Deactivate coupon
   * @param {string} id
   */
  async deactivateCoupon(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid coupon ID: ${id}`);
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw ApiError.notFound(`Coupon with ID '${id}' not found`);
    }

    coupon.status = 'inactive';
    await coupon.save();
    return coupon;
  }

  /**
   * Admin: Delete coupon
   * @param {string} id
   */
  async deleteCoupon(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid coupon ID: ${id}`);
    }

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw ApiError.notFound(`Coupon with ID '${id}' not found`);
    }

    return coupon;
  }
}

module.exports = new CouponsService();
