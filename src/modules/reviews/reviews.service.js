const mongoose = require('mongoose');
const Review = require('./reviews.model');
const Product = require('../products/products.model');
const Order = require('../orders/orders.model');
const ApiError = require('../../utils/apiError');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

class ReviewsService {
  /**
   * Recalculate and persist aggregate rating stats on the Product model
   * @param {string|ObjectId} productId
   */
  async updateProductRatingSummary(productId) {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) return;

    const stats = await Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          status: 'approved',
        },
      },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      const avg = Math.round(stats[0].averageRating * 10) / 10;
      await Product.findByIdAndUpdate(productId, {
        ratingAverage: avg,
        reviewCount: stats[0].reviewCount,
      });
    } else {
      await Product.findByIdAndUpdate(productId, {
        ratingAverage: 0,
        reviewCount: 0,
      });
    }
  }

  /**
   * Submit a new customer review with server-side verified purchase check
   * @param {Object} reviewInput
   */
  async submitReview(reviewInput) {
    const { productId, customerName, customerEmail, rating, title, comment } = reviewInput;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw ApiError.badRequest(`Invalid product ID format: ${productId}`);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${productId} not found`);
    }

    const normalizedEmail = customerEmail.toLowerCase().trim();

    // Verify purchase against Order database (Server-side authoritative)
    const matchingOrder = await Order.findOne({
      'customerSnapshot.email': normalizedEmail,
      'items.product': product._id,
      orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
    }).lean();

    const isVerified = Boolean(matchingOrder);
    const customerRef = matchingOrder ? matchingOrder.customer : undefined;

    const review = await Review.create({
      product: product._id,
      customer: customerRef,
      customerName: customerName.trim(),
      customerEmail: normalizedEmail,
      rating,
      title: title?.trim(),
      comment: comment.trim(),
      status: 'pending', // Pending admin moderation
      verifiedPurchase: isVerified,
    });

    return review;
  }

  /**
   * Public: Get approved reviews for a specific product with rating aggregations
   * @param {string} productId
   * @param {Object} query
   */
  async getReviewsForProduct(productId, query = {}) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw ApiError.badRequest(`Invalid product ID: ${productId}`);
    }

    const filter = {
      product: new mongoose.Types.ObjectId(productId),
      status: 'approved',
    };

    const { page, limit, skip } = getPaginationOptions(query);

    // Fetch approved reviews and rating distribution in parallel
    const [reviews, totalItems, distributionStats] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-customerEmail') // Protect customer email on public responses
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Format rating distribution map (1-5 stars)
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRatings = 0;

    distributionStats.forEach((item) => {
      if (ratingDistribution[item._id] !== undefined) {
        ratingDistribution[item._id] = item.count;
        sumRatings += item._id * item.count;
      }
    });

    const averageRating = totalItems > 0 ? Math.round((sumRatings / totalItems) * 10) / 10 : 0;
    const meta = formatPaginationMeta(totalItems, page, limit);

    return {
      reviews,
      summary: {
        averageRating,
        totalReviews: totalItems,
        ratingDistribution,
      },
      meta,
    };
  }

  /**
   * Admin: List all reviews across products with filters
   * @param {Object} query
   */
  async getAdminReviews(query = {}) {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.rating) {
      filter.rating = Number(query.rating);
    }
    if (query.productId && mongoose.Types.ObjectId.isValid(query.productId)) {
      filter.product = query.productId;
    }
    if (query.verifiedPurchase !== undefined) {
      filter.verifiedPurchase = query.verifiedPurchase === 'true' || query.verifiedPurchase === true;
    }
    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      filter.$or = [
        { customerName: { $regex: sanitized, $options: 'i' } },
        { customerEmail: { $regex: sanitized, $options: 'i' } },
        { title: { $regex: sanitized, $options: 'i' } },
        { comment: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const [reviews, totalItems] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('product', 'name slug price images')
        .populate('customer', 'firstName lastName email')
        .lean(),
      Review.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);
    return { reviews, meta };
  }

  /**
   * Admin: Moderate review status (approve, reject, pending)
   * @param {string} reviewId
   * @param {string} status
   */
  async moderateReview(reviewId, status) {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw ApiError.badRequest(`Invalid review ID: ${reviewId}`);
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      throw ApiError.notFound(`Review with ID '${reviewId}' not found`);
    }

    review.status = status;
    await review.save();

    // Recalculate product aggregate rating
    await this.updateProductRatingSummary(review.product);

    return review;
  }

  /**
   * Admin: Delete review and recalculate product statistics
   * @param {string} reviewId
   */
  async deleteReview(reviewId) {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw ApiError.badRequest(`Invalid review ID: ${reviewId}`);
    }

    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) {
      throw ApiError.notFound(`Review with ID '${reviewId}' not found`);
    }

    await this.updateProductRatingSummary(review.product);
    return review;
  }
}

module.exports = new ReviewsService();
