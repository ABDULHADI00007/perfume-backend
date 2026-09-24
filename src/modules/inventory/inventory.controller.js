const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const inventoryService = require('./inventory.service');

/**
 * Admin: Get paginated inventory list
 */
const getInventory = asyncHandler(async (req, res) => {
  const { inventory, meta } = await inventoryService.getInventory(req.query);
  return ApiResponse.success(res, 200, 'Inventory fetched successfully', inventory, meta);
});

/**
 * Admin: Get inventory by SKU
 */
const getInventoryBySku = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.getInventoryBySku(req.params.sku);
  return ApiResponse.success(res, 200, 'Inventory details fetched successfully', inventory);
});

/**
 * Admin: Get all inventory items for a specific product
 */
const getInventoryByProduct = asyncHandler(async (req, res) => {
  const items = await inventoryService.getInventoryByProduct(req.params.productId);
  return ApiResponse.success(res, 200, 'Product inventory fetched successfully', items);
});

/**
 * Admin: Create inventory entry
 */
const createInventory = asyncHandler(async (req, res) => {
  const performedBy = req.user?.email || req.user?.id || 'admin';
  const inventory = await inventoryService.createInventory(req.body, performedBy);
  return ApiResponse.created(res, 'Inventory record created successfully', inventory);
});

/**
 * Admin: Set physical quantity directly
 */
const updateQuantity = asyncHandler(async (req, res) => {
  const performedBy = req.user?.email || req.user?.id || 'admin';
  const inventory = await inventoryService.updateQuantity(
    req.params.id,
    req.body.quantity,
    req.body.reason,
    performedBy
  );
  return ApiResponse.success(res, 200, 'Inventory quantity updated successfully', inventory);
});

/**
 * Admin: Adjust stock quantity (+/-)
 */
const adjustStock = asyncHandler(async (req, res) => {
  const performedBy = req.user?.email || req.user?.id || 'admin';
  const inventory = await inventoryService.adjustStock(req.body, performedBy);
  return ApiResponse.success(res, 200, 'Stock adjusted successfully', inventory);
});

/**
 * Internal / Protected: Reserve stock for an order
 */
const reserveStock = asyncHandler(async (req, res) => {
  const performedBy = req.user?.email || req.user?.id || 'system';
  const reserved = await inventoryService.reserveStock(
    req.body.items,
    req.body.orderNumber,
    performedBy
  );
  return ApiResponse.success(res, 200, 'Stock reserved successfully', reserved);
});

/**
 * Internal / Protected: Release stock reservation
 */
const releaseStock = asyncHandler(async (req, res) => {
  const performedBy = req.user?.email || req.user?.id || 'system';
  const released = await inventoryService.releaseReservation(
    req.body.items,
    req.body.orderNumber,
    req.body.reason,
    performedBy
  );
  return ApiResponse.success(res, 200, 'Stock reservation released successfully', released);
});

module.exports = {
  getInventory,
  getInventoryBySku,
  getInventoryByProduct,
  createInventory,
  updateQuantity,
  adjustStock,
  reserveStock,
  releaseStock,
};
