const mongoose = require('mongoose');
const Inventory = require('./inventory.model');
const Product = require('../products/products.model');
const ApiError = require('../../utils/apiError');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

class InventoryService {
  /**
   * List inventory records with filters, search, and pagination
   * @param {Object} query
   */
  async getInventory(query = {}) {
    const { page, limit, skip, sort } = getPaginationOptions(query);
    const filter = {};

    // 1. Status Filter
    if (query.status) {
      filter.status = query.status;
    }

    // 2. Low Stock filter
    if (query.lowStock === 'true') {
      filter.status = { $in: ['low_stock', 'out_of_stock'] };
    }

    // 3. Search Filter (SKU or Product Name)
    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      const searchRegex = new RegExp(sanitized, 'i');
      const matchingProducts = await Product.find({
        $or: [{ name: searchRegex }, { brand: searchRegex }],
      }).select('_id');

      const productIds = matchingProducts.map((p) => p._id);
      filter.$or = [{ variantSku: searchRegex }, { product: { $in: productIds } }];
    }

    const [inventoryItems, totalItems] = await Promise.all([
      Inventory.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('product', 'name slug brand sku price images variants')
        .lean({ virtuals: true }),
      Inventory.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);

    return { inventory: inventoryItems, meta };
  }

  /**
   * Get single inventory document by SKU
   * @param {string} sku
   */
  async getInventoryBySku(sku) {
    if (!sku) {
      throw ApiError.badRequest('SKU is required');
    }

    const inventory = await Inventory.findOne({ variantSku: sku.toUpperCase().trim() })
      .populate('product', 'name slug brand sku price images variants')
      .lean({ virtuals: true });

    if (!inventory) {
      throw ApiError.notFound(`Inventory record not found for SKU: ${sku}`);
    }

    return inventory;
  }

  /**
   * Get all inventory items for a product
   * @param {string} productId
   */
  async getInventoryByProduct(productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const items = await Inventory.find({ product: productId })
      .populate('product', 'name slug brand sku price images variants')
      .lean({ virtuals: true });

    return items;
  }

  /**
   * Create inventory record (Admin)
   * @param {Object} data
   * @param {string} performedBy
   */
  async createInventory(data, performedBy = 'admin') {
    const { product: productId, variantSku, size, quantity = 0, lowStockThreshold = 5 } = data;

    const productExists = await Product.findById(productId);
    if (!productExists) {
      throw ApiError.notFound(`Product with ID ${productId} not found`);
    }

    const normalizedSku = variantSku.toUpperCase().trim();
    const existing = await Inventory.findOne({ product: productId, variantSku: normalizedSku });
    if (existing) {
      throw ApiError.conflict(`Inventory entry for SKU ${normalizedSku} already exists`);
    }

    const status =
      quantity <= 0 ? 'out_of_stock' : quantity <= lowStockThreshold ? 'low_stock' : 'in_stock';

    const inventory = await Inventory.create({
      product: productId,
      variantSku: normalizedSku,
      size,
      quantity,
      reservedQuantity: 0,
      lowStockThreshold,
      status,
      history: [
        {
          action: 'initial',
          quantityChanged: quantity,
          previousQuantity: 0,
          newQuantity: quantity,
          previousReserved: 0,
          newReserved: 0,
          reason: 'Initial stock entry',
          performedBy,
        },
      ],
    });

    return inventory;
  }

  /**
   * Direct update of physical stock quantity (Admin)
   * @param {string} id
   * @param {number} quantity
   * @param {string} reason
   * @param {string} performedBy
   */
  async updateQuantity(id, quantity, reason = 'Direct stock level update', performedBy = 'admin') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid inventory ID format');
    }

    const inventory = await Inventory.findById(id);
    if (!inventory) {
      throw ApiError.notFound(`Inventory record with ID ${id} not found`);
    }

    if (quantity < inventory.reservedQuantity) {
      throw ApiError.badRequest(
        `Physical quantity (${quantity}) cannot be lower than current reserved stock (${inventory.reservedQuantity})`
      );
    }

    const prevQty = inventory.quantity;
    const diff = quantity - prevQty;

    inventory.quantity = quantity;
    inventory.calculateStatus();
    inventory.history.push({
      action: 'set_quantity',
      quantityChanged: diff,
      previousQuantity: prevQty,
      newQuantity: quantity,
      previousReserved: inventory.reservedQuantity,
      newReserved: inventory.reservedQuantity,
      reason,
      performedBy,
    });

    await inventory.save();

    // Sync stock to product variants embedded list if matching
    await Product.updateOne(
      { _id: inventory.product, 'variants.sku': inventory.variantSku },
      { $set: { 'variants.$.stock': inventory.quantity } }
    );

    return inventory;
  }

  /**
   * Increment or decrement stock quantity with reason (Admin)
   * @param {Object} data
   * @param {string} performedBy
   */
  async adjustStock(data, performedBy = 'admin') {
    const { variantSku, productId, adjustment, reason } = data;
    const normalizedSku = variantSku.toUpperCase().trim();

    const query = { variantSku: normalizedSku };
    if (productId) query.product = productId;

    const inventory = await Inventory.findOne(query);
    if (!inventory) {
      throw ApiError.notFound(`Inventory record not found for SKU: ${normalizedSku}`);
    }

    const newQuantity = inventory.quantity + adjustment;
    if (newQuantity < 0) {
      throw ApiError.badRequest(`Adjustment would cause negative physical stock (Result: ${newQuantity})`);
    }

    if (newQuantity < inventory.reservedQuantity) {
      throw ApiError.badRequest(
        `Adjustment would cause physical quantity (${newQuantity}) to fall below reserved stock (${inventory.reservedQuantity})`
      );
    }

    const prevQty = inventory.quantity;
    inventory.quantity = newQuantity;
    inventory.calculateStatus();
    inventory.history.push({
      action: 'adjustment',
      quantityChanged: adjustment,
      previousQuantity: prevQty,
      newQuantity: newQuantity,
      previousReserved: inventory.reservedQuantity,
      newReserved: inventory.reservedQuantity,
      reason: reason || 'Inventory adjustment',
      performedBy,
    });

    await inventory.save();

    await Product.updateOne(
      { _id: inventory.product, 'variants.sku': inventory.variantSku },
      { $set: { 'variants.$.stock': inventory.quantity } }
    );

    return inventory;
  }

  /**
   * Concurrency-safe atomic stock reservation
   * @param {Array<{ variantSku: string, productId?: string, quantity: number }>} items
   * @param {string} orderNumber
   * @param {string} performedBy
   */
  async reserveStock(items = [], orderNumber = '', performedBy = 'system') {
    if (!items || items.length === 0) {
      throw ApiError.badRequest('No items provided for reservation');
    }

    const reservedItems = [];

    try {
      for (const item of items) {
        const sku = item.variantSku.toUpperCase().trim();
        const qty = item.quantity;

        // Atomic update: only increment reservedQuantity if (quantity - reservedQuantity) >= qty
        const updated = await Inventory.findOneAndUpdate(
          {
            variantSku: sku,
            ...(item.productId && { product: item.productId }),
            $expr: {
              $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, qty],
            },
          },
          {
            $inc: { reservedQuantity: qty },
          },
          { new: true }
        );

        if (!updated) {
          throw ApiError.badRequest(
            `Insufficient available stock to reserve item with SKU: ${sku}`
          );
        }

        // Recalculate status and add audit log
        updated.calculateStatus();
        updated.history.push({
          action: 'reservation',
          quantityChanged: qty,
          previousQuantity: updated.quantity,
          newQuantity: updated.quantity,
          previousReserved: updated.reservedQuantity - qty,
          newReserved: updated.reservedQuantity,
          reason: `Reservation for Order ${orderNumber || 'Pending'}`,
          performedBy,
          orderNumber,
        });
        await updated.save();

        reservedItems.push({
          inventoryId: updated._id,
          variantSku: sku,
          quantity: qty,
        });
      }

      return reservedItems;
    } catch (error) {
      // Rollback any successfully reserved items in this batch to maintain atomicity
      for (const reserved of reservedItems) {
        await Inventory.findOneAndUpdate(
          { _id: reserved.inventoryId },
          { $inc: { reservedQuantity: -reserved.quantity } }
        );
      }
      throw error;
    }
  }

  /**
   * Concurrency-safe atomic release of reserved stock (Cancellation/Expiration)
   * @param {Array<{ variantSku: string, productId?: string, quantity: number }>} items
   * @param {string} orderNumber
   * @param {string} reason
   * @param {string} performedBy
   */
  async releaseReservation(items = [], orderNumber = '', reason = '', performedBy = 'system') {
    const results = [];

    for (const item of items) {
      const sku = item.variantSku.toUpperCase().trim();
      const qty = item.quantity;

      const updated = await Inventory.findOneAndUpdate(
        {
          variantSku: sku,
          ...(item.productId && { product: item.productId }),
          reservedQuantity: { $gte: qty },
        },
        {
          $inc: { reservedQuantity: -qty },
        },
        { new: true }
      );

      if (updated) {
        updated.calculateStatus();
        updated.history.push({
          action: 'release',
          quantityChanged: -qty,
          previousQuantity: updated.quantity,
          newQuantity: updated.quantity,
          previousReserved: updated.reservedQuantity + qty,
          newReserved: updated.reservedQuantity,
          reason: reason || `Reservation released for Order ${orderNumber}`,
          performedBy,
          orderNumber,
        });
        await updated.save();
        results.push(updated);
      }
    }

    return results;
  }

  /**
   * Concurrency-safe atomic stock deduction on order fulfillment/confirmation
   * @param {Array<{ variantSku: string, productId?: string, quantity: number }>} items
   * @param {string} orderNumber
   * @param {string} performedBy
   */
  async commitStockDeduction(items = [], orderNumber = '', performedBy = 'system') {
    const results = [];

    for (const item of items) {
      const sku = item.variantSku.toUpperCase().trim();
      const qty = item.quantity;

      const updated = await Inventory.findOneAndUpdate(
        {
          variantSku: sku,
          ...(item.productId && { product: item.productId }),
          quantity: { $gte: qty },
          reservedQuantity: { $gte: qty },
        },
        {
          $inc: { quantity: -qty, reservedQuantity: -qty },
        },
        { new: true }
      );

      if (updated) {
        updated.calculateStatus();
        updated.history.push({
          action: 'commit_order',
          quantityChanged: -qty,
          previousQuantity: updated.quantity + qty,
          newQuantity: updated.quantity,
          previousReserved: updated.reservedQuantity + qty,
          newReserved: updated.reservedQuantity,
          reason: `Stock fulfilled for Order ${orderNumber}`,
          performedBy,
          orderNumber,
        });
        await updated.save();

        await Product.updateOne(
          { _id: updated.product, 'variants.sku': updated.variantSku },
          { $set: { 'variants.$.stock': updated.quantity } }
        );

        results.push(updated);
      }
    }

    return results;
  }
}

module.exports = new InventoryService();
