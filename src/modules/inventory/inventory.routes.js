const express = require('express');
const inventoryController = require('./inventory.controller');
const {
  createInventorySchema,
  updateQuantitySchema,
  adjustStockSchema,
  reserveStockSchema,
  releaseStockSchema,
  queryInventorySchema,
} = require('./inventory.validation');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// All Inventory endpoints require authentication
router.use(authenticate);

router.get('/', requirePermission('inventory.read'), validate(queryInventorySchema), inventoryController.getInventory);
router.get('/sku/:sku', requirePermission('inventory.read'), inventoryController.getInventoryBySku);
router.get('/product/:productId', requirePermission('inventory.read'), inventoryController.getInventoryByProduct);
router.post('/', requirePermission('inventory.adjust'), validate(createInventorySchema), inventoryController.createInventory);
router.patch('/:id/quantity', requirePermission('inventory.adjust'), validate(updateQuantitySchema), inventoryController.updateQuantity);
router.post('/adjust', requirePermission('inventory.adjust'), validate(adjustStockSchema), inventoryController.adjustStock);
router.post('/reserve', requirePermission('inventory.adjust'), validate(reserveStockSchema), inventoryController.reserveStock);
router.post('/release', requirePermission('inventory.adjust'), validate(releaseStockSchema), inventoryController.releaseStock);

module.exports = router;
