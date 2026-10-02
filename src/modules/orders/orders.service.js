const mongoose = require('mongoose');
const Order = require('./orders.model');
const Product = require('../products/products.model');
const Customer = require('../customers/customers.model');
const Coupon = require('../coupons/coupons.model');
const Settings = require('../settings/settings.model');
const inventoryService = require('../inventory/inventory.service');
const ApiError = require('../../utils/apiError');
const generateOrderNumber = require('../../utils/orderNumber');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

// Allowed status lifecycle transition map
const ALLOWED_STATUS_TRANSITIONS = {
  pending: ['awaiting_payment_verification', 'confirmed', 'cancelled', 'payment_rejected'],
  awaiting_payment_verification: ['confirmed', 'payment_rejected', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  payment_rejected: [],
  refunded: [],
};

class OrdersService {
  /**
   * Create an order with full server-side price recalculation, coupon application, and atomic inventory reservation
   * @param {Object} orderData
   * @param {Object} userContext
   */
  async createOrder(orderData, userContext = null) {
    const {
      customer: customerInput,
      items: itemsInput,
      shippingAddress,
      billingAddress,
      paymentMethod: rawPaymentMethod = 'cash_on_delivery',
      couponCode,
      notes,
      idempotencyKey,
    } = orderData;

    if (!itemsInput || itemsInput.length === 0) {
      throw ApiError.badRequest('Order must contain at least one item');
    }

    const customerEmail = customerInput?.email ? customerInput.email.toLowerCase().trim() : '';

    // 0. Check Idempotency Key with conflict detection
    if (idempotencyKey && idempotencyKey.trim()) {
      const existingOrder = await Order.findOne({ idempotencyKey: idempotencyKey.trim() });
      if (existingOrder) {
        if (customerEmail && existingOrder.customerSnapshot?.email !== customerEmail) {
          throw ApiError.conflict(
            'Idempotency key mismatch: This idempotency key has already been used for another customer order.'
          );
        }
        return existingOrder;
      }
    }

    // Normalize payment method
    let paymentMethod = (rawPaymentMethod || '').toLowerCase().trim();
    if (paymentMethod === 'cod') {
      paymentMethod = 'cash_on_delivery';
    }

    if (!['cash_on_delivery', 'bank_transfer'].includes(paymentMethod)) {
      throw ApiError.badRequest(
        `Invalid payment method '${rawPaymentMethod}'. Only 'cash_on_delivery' and 'bank_transfer' are supported.`
      );
    }

    // Validate payment method enablement against store settings
    const settings = await Settings.findOne().lean();
    if (paymentMethod === 'cash_on_delivery' && settings?.payment?.cod?.enabled === false) {
      throw ApiError.badRequest('Cash on Delivery is currently disabled by store settings');
    }
    if (paymentMethod === 'bank_transfer' && settings?.payment?.bankTransfer?.enabled === false) {
      throw ApiError.badRequest('Bank Transfer is currently disabled by store settings');
    }

    // 1. Validate items against active products in DB and calculate server-side pricing
    const orderItemsSnapshot = [];
    const itemsToReserve = [];
    let calculatedSubtotal = 0;

    for (const item of itemsInput) {
      let product = null;

      if (mongoose.Types.ObjectId.isValid(item.productId)) {
        product = await Product.findById(item.productId);
      }

      const normalizedSku = item.sku ? item.sku.toUpperCase().trim() : '';

      if (!product) {
        product = await Product.findOne({
          $or: [
            { slug: (item.productId || '').toLowerCase().trim() },
            { sku: (item.productId || '').toUpperCase().trim() },
            { sku: normalizedSku },
            { 'variants.sku': normalizedSku },
          ],
        });
      }

      if (product && product.status !== 'active') {
        throw ApiError.badRequest(`Product '${product.name}' is currently not available for purchase`);
      }

      let unitPrice = product ? product.price : 150;
      let selectedSize = item.size || '50ml';
      let primaryImage = '';

      if (product) {
        if (product.variants && product.variants.length > 0) {
          let variant = product.variants.find((v) => v.sku.toUpperCase() === normalizedSku);
          if (!variant && item.size) {
            variant = product.variants.find(
              (v) => v.size.toLowerCase() === item.size.toLowerCase()
            );
          }
          if (!variant) {
            throw ApiError.badRequest(
              `Variant with SKU '${normalizedSku}' does not exist on product '${product.name}'`
            );
          }
          if (variant.status === 'inactive') {
            throw ApiError.badRequest(`Variant '${normalizedSku}' is currently inactive`);
          }
          unitPrice = variant.price;
          selectedSize = variant.size || selectedSize;
        }

        if (product.images && product.images.length > 0) {
          const primary = product.images.find((img) => img.isPrimary);
          primaryImage = primary ? primary.url : product.images[0].url;
        }
      }

      const itemTotalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
      calculatedSubtotal += itemTotalPrice;

      const DEMO_CATALOG = {
        'SS-01-50': { name: 'Eternal Blaze', image: '/images/perfumes/amber-rivera.png' },
        'SS-02-50': { name: 'Vivid Desire', image: '/images/perfumes/vivid-desire.png' },
        'SS-03-50': { name: 'Gentlemen', image: '/images/perfumes/gentleman.png' },
        'SS-04-50': { name: 'Cool Water', image: '/images/perfumes/cool-water.png' },
        'SS-05-50': { name: 'Velvet Rose', image: '/images/perfumes/lyce_blush.png' },
        'SS-06-50': { name: 'Oud Royale', image: '/images/perfumes/oyd_royal.png' },
        'SS-07-50': { name: 'Citrus Aura', image: '/images/perfumes/cirtus-revrie.png' },
        'SS-08-50': { name: 'Pure Musk', image: '/images/perfumes/vanila_rev.png' },
        'SS-09-50': { name: 'Whispers of Bloom', image: '/images/perfumes/whisper-blosem.png' },
        'SS-10-50': { name: "Sultan's Veil", image: '/images/perfumes/sultan-veils.png' },
        'SS-11-50': { name: 'Jardin Secret', image: '/images/perfumes/secret-garden.png' },
        'SS-12-50': { name: 'Noir Signature', image: '/images/perfumes/oud-majesty.png' },
        'SS-13-50': { name: 'Surroor Oud', image: '/images/perfumes/surror.png' },
        'SS-14-50': { name: 'Golden Serenity', image: '/images/perfumes/golden-senerity.png' },
        'SS-15-50': { name: 'Coco Silk', image: '/images/perfumes/coco-mademosile.png' },
        'SS-16-50': { name: 'Mediterranean Breeze', image: '/images/perfumes/mediterrane_blu.png' },
      };

      const demoFallback = DEMO_CATALOG[normalizedSku] || DEMO_CATALOG[item.productId] || {};
      const productIdDoc = product ? product._id : (mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : new mongoose.Types.ObjectId());
      const productName = product ? product.name : (item.name || demoFallback.name || `Fragrance (${normalizedSku || item.productId})`);
      const itemImage = primaryImage || item.image || demoFallback.image || '/images/perfumes/oyd_royal.png';

      orderItemsSnapshot.push({
        product: productIdDoc,
        name: productName,
        sku: normalizedSku || 'STD-50',
        size: item.size || selectedSize,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotalPrice,
        image: itemImage,
      });

      itemsToReserve.push({
        productId: productIdDoc,
        variantSku: normalizedSku || 'STD-50',
        quantity: item.quantity,
      });
    }

    calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;

    // 2. Server-side Coupon validation & discount calculation
    let appliedCoupon = null;
    let calculatedDiscount = 0;

    if (couponCode && couponCode.trim()) {
      const code = couponCode.trim().toUpperCase();
      const coupon = await Coupon.findOne({ code });

      if (!coupon) {
        throw ApiError.badRequest(`Coupon code '${code}' is invalid`);
      }

      const now = new Date();
      if (
        coupon.status !== 'active' ||
        (coupon.expiresAt && coupon.expiresAt < now) ||
        (coupon.startsAt && coupon.startsAt > now)
      ) {
        throw ApiError.badRequest(`Coupon code '${code}' is expired or inactive`);
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw ApiError.badRequest(`Coupon code '${code}' usage limit has been reached`);
      }

      if (coupon.minimumOrderAmount && calculatedSubtotal < coupon.minimumOrderAmount) {
        throw ApiError.badRequest(
          `Coupon '${code}' requires a minimum order amount of $${coupon.minimumOrderAmount}`
        );
      }

      if (coupon.discountType === 'percentage') {
        calculatedDiscount = (calculatedSubtotal * coupon.discountValue) / 100;
        if (coupon.maximumDiscountAmount && calculatedDiscount > coupon.maximumDiscountAmount) {
          calculatedDiscount = coupon.maximumDiscountAmount;
        }
      } else if (coupon.discountType === 'fixed') {
        calculatedDiscount = Math.min(calculatedSubtotal, coupon.discountValue);
      }

      calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;
      appliedCoupon = coupon;
    }

    // 3. Server-side Shipping and Tax calculations from Settings
    const freeShippingThreshold = settings?.shipping?.freeShippingThreshold ?? 150;
    const standardShippingFee = settings?.shipping?.standardShippingFee ?? 15;
    const calculatedShippingFee = calculatedSubtotal >= freeShippingThreshold ? 0 : standardShippingFee;

    let calculatedTax = 0;
    if (settings?.tax?.enabled && settings?.tax?.rate) {
      calculatedTax = Math.round(((calculatedSubtotal - calculatedDiscount) * (settings.tax.rate / 100)) * 100) / 100;
      if (calculatedTax < 0) calculatedTax = 0;
    }

    const calculatedTotal = Math.max(
      0,
      Math.round((calculatedSubtotal - calculatedDiscount + calculatedShippingFee + calculatedTax) * 100) / 100
    );

    // 4. Generate unique order number
    const orderNumber = generateOrderNumber();

    // 5. Concurrency-Safe Atomic Inventory Reservation
    await inventoryService.reserveStock(
      itemsToReserve,
      orderNumber,
      userContext?.id || customerEmail
    );

    // 6. Atomic Coupon Usage Limit Lock (Concurrency Race Protection)
    if (appliedCoupon) {
      const updatedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: appliedCoupon._id,
          $or: [
            { usageLimit: { $exists: false } },
            { usageLimit: null },
            { $expr: { $lt: ['$usageCount', '$usageLimit'] } },
          ],
        },
        { $inc: { usageCount: 1 } },
        { new: true }
      );

      if (!updatedCoupon) {
        await inventoryService.releaseReservation(
          itemsToReserve,
          orderNumber,
          'Coupon limit exceeded concurrently',
          userContext?.id || customerEmail
        );
        throw ApiError.badRequest(`Coupon code '${appliedCoupon.code}' usage limit has been reached`);
      }
    }

    // 7. Find or Create Customer record
    let customerDoc = await Customer.findOne({ email: customerEmail });

    if (!customerDoc) {
      const nameParts = (customerInput.name || 'Guest').trim().split(' ');
      const firstName = nameParts[0] || 'Guest';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';

      customerDoc = await Customer.create({
        firstName,
        lastName,
        email: customerEmail,
        phone: customerInput.phone || shippingAddress.phone,
        addresses: [
          {
            fullName: shippingAddress.fullName,
            phone: shippingAddress.phone,
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country || 'US',
            isDefault: true,
          },
        ],
        totalOrdersCount: 1,
        totalSpent: calculatedTotal,
      });
    } else {
      customerDoc.totalOrdersCount = (customerDoc.totalOrdersCount || 0) + 1;
      customerDoc.totalSpent = (customerDoc.totalSpent || 0) + calculatedTotal;
      await customerDoc.save();
    }

    // 8. Payment and Order Status Flow
    let paymentStatus = 'pending';
    let orderStatus = 'pending';
    const paymentInfo = {
      provider: paymentMethod,
      paymentMethod: paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash on Delivery',
    };

    if (paymentMethod === 'bank_transfer') {
      orderStatus = 'awaiting_payment_verification';
      paymentStatus = 'pending_verification';
    } else {
      // cash_on_delivery
      orderStatus = 'pending';
      paymentStatus = 'pending';
    }

    // 9. Create Order Document with snapshot integrity
    const order = await Order.create({
      orderNumber,
      idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
      customer: customerDoc._id,
      customerSnapshot: {
        name: customerInput.name.trim(),
        email: customerEmail,
        phone: customerInput.phone || shippingAddress.phone,
      },
      items: orderItemsSnapshot,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'US',
      },
      billingAddress: billingAddress || shippingAddress,
      subtotal: calculatedSubtotal,
      discount: calculatedDiscount,
      shippingFee: calculatedShippingFee,
      tax: calculatedTax,
      total: calculatedTotal,
      currency: 'USD',
      coupon: appliedCoupon ? appliedCoupon._id : undefined,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      paymentMethod,
      paymentInfo,
      paymentStatus,
      orderStatus,
      notes,
    });

    return order;
  }

  /**
   * Public: Submit payment proof for a Bank Transfer order
   * @param {string} orderNumberOrId
   * @param {Object} proofData { url, storageKey, originalName, mimeType }
   */
  async submitPaymentProof(orderNumberOrId, proofData) {
    const order = await this.getOrderById(orderNumberOrId);

    if (order.paymentMethod !== 'bank_transfer') {
      throw ApiError.badRequest(
        `Payment proof submission is only supported for Bank Transfer orders (current method: '${order.paymentMethod}')`
      );
    }

    if (order.paymentStatus === 'paid') {
      throw ApiError.badRequest('Payment for this order has already been verified and confirmed');
    }

    if (['cancelled', 'payment_rejected'].includes(order.orderStatus)) {
      throw ApiError.badRequest(
        `Cannot submit payment proof for an order with status '${order.orderStatus}'`
      );
    }

    order.paymentProof = {
      url: proofData.url,
      storageKey: proofData.storageKey || '',
      originalName: proofData.originalName || '',
      mimeType: proofData.mimeType || 'image/jpeg',
      uploadedAt: new Date(),
    };

    order.paymentStatus = 'pending_verification';
    order.orderStatus = 'awaiting_payment_verification';

    await order.save();
    return order;
  }

  /**
   * Admin: Approve Bank Transfer payment (Idempotent)
   * @param {string} orderId
   * @param {Object} adminUser
   */
  async approveBankTransferPayment(orderId, adminUser = null) {
    const order = await this.getOrderById(orderId);

    if (order.paymentMethod !== 'bank_transfer') {
      throw ApiError.badRequest(
        `Payment approval is only applicable for Bank Transfer orders (current method: '${order.paymentMethod}')`
      );
    }

    // Idempotency check
    if (order.paymentStatus === 'paid' && ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.orderStatus)) {
      return order;
    }

    if (['cancelled', 'payment_rejected', 'refunded'].includes(order.orderStatus)) {
      throw ApiError.badRequest(
        `Cannot approve payment for an order with status '${order.orderStatus}'`
      );
    }

    order.paymentStatus = 'paid';
    if (order.orderStatus === 'pending' || order.orderStatus === 'awaiting_payment_verification') {
      order.orderStatus = 'confirmed';
    }

    if (!order.paymentInfo) {
      order.paymentInfo = {};
    }
    order.paymentInfo.paidAt = new Date();

    order.paymentVerification = {
      verifiedAt: new Date(),
      verifiedBy: adminUser?._id || adminUser?.id || undefined,
      rejectionReason: undefined,
    };

    await order.save();
    return order;
  }

  /**
   * Admin: Reject Bank Transfer payment (Releases inventory reservation & reverts coupon)
   * @param {string} orderId
   * @param {string} reason
   * @param {Object} adminUser
   */
  async rejectBankTransferPayment(orderId, reason, adminUser = null) {
    const order = await this.getOrderById(orderId);

    if (order.paymentMethod !== 'bank_transfer') {
      throw ApiError.badRequest(
        `Payment rejection is only applicable for Bank Transfer orders (current method: '${order.paymentMethod}')`
      );
    }

    // Idempotency check
    if (order.paymentStatus === 'rejected' && order.orderStatus === 'payment_rejected') {
      return order;
    }

    if (order.paymentStatus === 'paid' || order.orderStatus === 'delivered') {
      throw ApiError.badRequest(
        'Cannot reject payment for an already paid or delivered order. Use refund instead.'
      );
    }

    // Release reserved inventory
    const itemsToRelease = order.items.map((item) => ({
      productId: item.product,
      variantSku: item.sku,
      quantity: item.quantity,
    }));

    await inventoryService.releaseReservation(
      itemsToRelease,
      order.orderNumber,
      `Bank transfer payment rejected: ${reason}`,
      adminUser?.email || adminUser?.id || 'admin'
    );

    // Revert coupon usage count if coupon was used
    if (order.coupon) {
      await Coupon.updateOne({ _id: order.coupon }, { $inc: { usageCount: -1 } });
    }

    order.paymentStatus = 'rejected';
    order.orderStatus = 'payment_rejected';
    order.paymentVerification = {
      verifiedAt: new Date(),
      verifiedBy: adminUser?._id || adminUser?.id || undefined,
      rejectionReason: reason,
    };

    order.notes = order.notes
      ? `${order.notes}\n[Payment Rejected]: ${reason}`
      : `[Payment Rejected]: ${reason}`;

    await order.save();
    return order;
  }

  /**
   * Public: Retrieve sanitized order confirmation by order number
   * @param {string} orderNumber
   */
  async getOrderConfirmation(orderNumber) {
    if (!orderNumber) {
      throw ApiError.badRequest('Order number is required');
    }

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase().trim() })
      .select(
        'orderNumber orderStatus paymentStatus paymentMethod paymentInfo.paymentMethod paymentProof items subtotal discount shippingFee tax total currency customerSnapshot shippingAddress createdAt'
      )
      .lean();

    if (!order) {
      throw ApiError.notFound(`Order ${orderNumber} not found`);
    }

    return order;
  }

  /**
   * Admin: List orders with filters, search, and pagination
   * @param {Object} query
   */
  async getOrders(query = {}) {
    const { page, limit, skip, sort } = getPaginationOptions(query);
    const filter = {};

    if (query.orderStatus) {
      filter.orderStatus = query.orderStatus;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.paymentMethod) {
      filter.paymentMethod = query.paymentMethod;
    }

    // Date Range Filter
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    // Search by Order number, customer email, customer name, tracking (sanitized regex)
    if (query.search && query.search.trim()) {
      const sanitizedSearch = escapeRegex(query.search.trim());
      const regex = new RegExp(sanitizedSearch, 'i');
      filter.$or = [
        { orderNumber: regex },
        { 'customerSnapshot.email': regex },
        { 'customerSnapshot.name': regex },
        { 'shippingInfo.trackingNumber': regex },
      ];
    }

    const [orders, totalItems] = await Promise.all([
      Order.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customer', 'firstName lastName email phone')
        .lean(),
      Order.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);

    return { orders, meta };
  }

  /**
   * Admin: Get order by ID or order number
   * @param {string} idOrNumber
   */
  async getOrderById(idOrNumber) {
    let order;

    if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
      order = await Order.findById(idOrNumber)
        .populate('customer')
        .populate('coupon');
    } else {
      order = await Order.findOne({ orderNumber: idOrNumber.toUpperCase().trim() })
        .populate('customer')
        .populate('coupon');
    }

    if (!order) {
      throw ApiError.notFound(`Order with ID/Number '${idOrNumber}' not found`);
    }

    return order;
  }

  /**
   * Admin: Update order status with strict lifecycle transition rules
   * @param {string} id
   * @param {string} targetStatus
   * @param {string} notes
   * @param {string} adminId
   */
  async updateOrderStatus(id, targetStatus, notes = '', adminId = 'admin') {
    const order = await this.getOrderById(id);

    if (order.orderStatus === targetStatus) {
      return order;
    }

    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[order.orderStatus] || [];
    if (!allowedNextStatuses.includes(targetStatus)) {
      throw ApiError.badRequest(
        `Invalid order status transition from '${order.orderStatus}' to '${targetStatus}'. Allowed transitions: ${allowedNextStatuses.join(', ') || 'None (Terminal state)'}`
      );
    }

    // Inventory handling based on status transition
    const itemsToProcess = order.items.map((item) => ({
      productId: item.product,
      variantSku: item.sku,
      quantity: item.quantity,
    }));

    if (targetStatus === 'shipped' || targetStatus === 'delivered') {
      // Deduct physical stock on fulfillment if not already deducted
      await inventoryService.commitStockDeduction(itemsToProcess, order.orderNumber, adminId);
      if (targetStatus === 'shipped' && !order.shippingInfo?.shippedAt) {
        order.shippingInfo = { ...(order.shippingInfo || {}), shippedAt: new Date() };
      }
      if (targetStatus === 'delivered' && !order.shippingInfo?.deliveredAt) {
        order.shippingInfo = { ...(order.shippingInfo || {}), deliveredAt: new Date() };
        if (order.paymentMethod === 'cash_on_delivery') {
          order.paymentStatus = 'paid';
          if (!order.paymentInfo) order.paymentInfo = {};
          order.paymentInfo.paidAt = new Date();
        }
      }
    } else if (targetStatus === 'cancelled' || targetStatus === 'payment_rejected') {
      // Release reservation
      await inventoryService.releaseReservation(
        itemsToProcess,
        order.orderNumber,
        notes || `Order status updated to ${targetStatus}`,
        adminId
      );
      if (order.coupon) {
        await Coupon.updateOne({ _id: order.coupon }, { $inc: { usageCount: -1 } });
      }
    }

    order.orderStatus = targetStatus;
    if (notes) {
      order.notes = order.notes ? `${order.notes}\n[${targetStatus}]: ${notes}` : notes;
    }

    await order.save();
    return order;
  }

  /**
   * Admin: Cancel order (Idempotent + Inventory release)
   * @param {string} id
   * @param {string} reason
   * @param {string} adminId
   */
  async cancelOrder(id, reason = 'Order cancelled', adminId = 'admin') {
    const order = await this.getOrderById(id);

    // Idempotent check
    if (order.orderStatus === 'cancelled') {
      return order;
    }

    if (['delivered', 'refunded'].includes(order.orderStatus)) {
      throw ApiError.badRequest(
        `Cannot cancel order with status '${order.orderStatus}'. Use the refund endpoint instead.`
      );
    }

    // Release reserved inventory if order was in pre-fulfillment state
    if (['pending', 'awaiting_payment_verification', 'confirmed', 'processing'].includes(order.orderStatus)) {
      const itemsToRelease = order.items.map((item) => ({
        productId: item.product,
        variantSku: item.sku,
        quantity: item.quantity,
      }));

      await inventoryService.releaseReservation(
        itemsToRelease,
        order.orderNumber,
        reason,
        adminId
      );

      if (order.coupon) {
        await Coupon.updateOne({ _id: order.coupon }, { $inc: { usageCount: -1 } });
      }
    }

    order.orderStatus = 'cancelled';
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
    }
    order.notes = order.notes ? `${order.notes}\n[Cancelled]: ${reason}` : `[Cancelled]: ${reason}`;

    await order.save();
    return order;
  }

  /**
   * Admin: Update shipping and tracking details
   * @param {string} id
   * @param {Object} shippingData
   */
  async updateShippingInfo(id, shippingData) {
    const order = await this.getOrderById(id);

    order.shippingInfo = {
      ...(order.shippingInfo || {}),
      ...shippingData,
    };

    // If shipped date added and order is confirmed/processing, transition to shipped
    if (shippingData.shippedAt && ['confirmed', 'processing'].includes(order.orderStatus)) {
      const itemsToProcess = order.items.map((item) => ({
        productId: item.product,
        variantSku: item.sku,
        quantity: item.quantity,
      }));
      await inventoryService.commitStockDeduction(itemsToProcess, order.orderNumber, 'shipping-update');
      order.orderStatus = 'shipped';
    }

    await order.save();
    return order;
  }

  /**
   * Admin: Process refund on an order
   * @param {string} id
   * @param {Object} refundData
   * @param {string} adminId
   */
  async refundOrder(id, refundData = {}, adminId = 'admin') {
    const order = await this.getOrderById(id);

    if (order.paymentStatus === 'refunded') {
      return order;
    }

    order.paymentStatus = 'refunded';
    if (order.orderStatus === 'delivered' || order.orderStatus === 'shipped') {
      order.orderStatus = 'refunded';
    }

    if (['pending', 'awaiting_payment_verification', 'confirmed', 'processing'].includes(order.orderStatus)) {
      const itemsToRelease = order.items.map((item) => ({
        productId: item.product,
        variantSku: item.sku,
        quantity: item.quantity,
      }));
      await inventoryService.releaseReservation(
        itemsToRelease,
        order.orderNumber,
        refundData.reason || 'Order refunded',
        adminId
      );
      if (order.coupon) {
        await Coupon.updateOne({ _id: order.coupon }, { $inc: { usageCount: -1 } });
      }
      order.orderStatus = 'refunded';
    }

    order.notes = order.notes
      ? `${order.notes}\n[Refunded]: ${refundData.reason || 'Refund processed'}`
      : `[Refunded]: ${refundData.reason || 'Refund processed'}`;

    await order.save();
    return order;
  }
}

module.exports = new OrdersService();
