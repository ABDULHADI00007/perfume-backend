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
const { authorize } = require('../../middleware/role.middleware');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

// All Inventory endpoints are admin-protected
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', validate(queryInventorySchema), inventoryController.getInventory);
router.get('/sku/:sku', inventoryController.getInventoryBySku);
router.get('/product/:productId', inventoryController.getInventoryByProduct);
router.post('/', validate(createInventorySchema), inventoryController.createInventory);
router.patch('/:id/quantity', validate(updateQuantitySchema), inventoryController.updateQuantity);
router.post('/adjust', validate(adjustStockSchema), inventoryController.adjustStock);
router.post('/reserve', validate(reserveStockSchema), inventoryController.reserveStock);
router.post('/release', validate(releaseStockSchema), inventoryController.releaseStock);

module.exports = router;
