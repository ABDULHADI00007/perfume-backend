const mongoose = require('mongoose');
const Newsletter = require('./newsletter.model');
const ApiError = require('../../utils/apiError');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

class NewsletterService {
  /**
   * Public: Idempotently subscribe an email to the newsletter
   * @param {string} email
   * @param {string} source
   */
  async subscribe(email, source = 'website_footer') {
    const normalizedEmail = email.toLowerCase().trim();

    let subscriber = await Newsletter.findOne({ email: normalizedEmail });

    if (subscriber) {
      if (subscriber.status === 'subscribed') {
        return {
          subscriber,
          message: 'You are already subscribed to our newsletter.',
          isNew: false,
        };
      }
      subscriber.status = 'subscribed';
      subscriber.subscribedAt = new Date();
      subscriber.unsubscribedAt = undefined;
      if (source) subscriber.source = source;
      await subscriber.save();

      return {
        subscriber,
        message: 'Welcome back! Your subscription has been reactivated.',
        isNew: false,
      };
    }

    subscriber = await Newsletter.create({
      email: normalizedEmail,
      source,
      status: 'subscribed',
      subscribedAt: new Date(),
    });

    return {
      subscriber,
      message: 'Thank you for subscribing to our newsletter.',
      isNew: true,
    };
  }

  /**
   * Public: Unsubscribe an email
   * @param {string} email
   */
  async unsubscribe(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const subscriber = await Newsletter.findOne({ email: normalizedEmail });

    if (!subscriber) {
      throw ApiError.notFound('Subscriber email not found');
    }

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    return {
      message: 'You have been successfully unsubscribed.',
    };
  }

  /**
   * Admin: List subscribers with pagination, search, and status filter
   * @param {Object} query
   */
  async getSubscribers(query = {}) {
    const { page, limit, skip, sort } = getPaginationOptions(query);
    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.search && query.search.trim()) {
      filter.email = { $regex: escapeRegex(query.search.trim()), $options: 'i' };
    }

    const [subscribers, totalItems] = await Promise.all([
      Newsletter.find(filter)
        .sort(sort || { subscribedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Newsletter.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);
    return { subscribers, meta };
  }

  /**
   * Admin: Update subscriber status
   * @param {string} id
   * @param {string} status
   */
  async updateSubscriberStatus(id, status) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid subscriber ID: ${id}`);
    }

    const subscriber = await Newsletter.findById(id);
    if (!subscriber) {
      throw ApiError.notFound(`Subscriber with ID '${id}' not found`);
    }

    subscriber.status = status;
    if (status === 'unsubscribed') {
      subscriber.unsubscribedAt = new Date();
    } else if (status === 'subscribed') {
      subscriber.subscribedAt = new Date();
      subscriber.unsubscribedAt = undefined;
    }

    await subscriber.save();
    return subscriber;
  }

  /**
   * Admin: Delete subscriber
   * @param {string} id
   */
  async deleteSubscriber(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid subscriber ID: ${id}`);
    }

    const subscriber = await Newsletter.findByIdAndDelete(id);
    if (!subscriber) {
      throw ApiError.notFound(`Subscriber with ID '${id}' not found`);
    }

    return subscriber;
  }
}

module.exports = new NewsletterService();
