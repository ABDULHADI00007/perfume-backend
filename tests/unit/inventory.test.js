const mongoose = require('mongoose');
const inventoryService = require('../../src/modules/inventory/inventory.service');
const Inventory = require('../../src/modules/inventory/inventory.model');
const Product = require('../../src/modules/products/products.model');
const ApiError = require('../../src/utils/apiError');

describe('Inventory Business Logic & Service Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Inventory Creation & Direct Stock Updates', () => {
    test('create inventory entry for product variant', async () => {
      const mockProduct = { _id: new mongoose.Types.ObjectId(), name: 'Santal 33' };
      jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);
      jest.spyOn(Inventory, 'findOne').mockResolvedValue(null);

      const createdInv = {
        _id: new mongoose.Types.ObjectId(),
        product: mockProduct._id,
        variantSku: 'SAN-100',
        quantity: 50,
        reservedQuantity: 0,
        status: 'in_stock',
      };
      jest.spyOn(Inventory, 'create').mockResolvedValue(createdInv);

      const result = await inventoryService.createInventory({
        product: mockProduct._id.toString(),
        variantSku: 'SAN-100',
        quantity: 50,
      });

      expect(result.variantSku).toBe('SAN-100');
      expect(result.quantity).toBe(50);
    });

    test('updateQuantity updates stock level and logs audit history', async () => {
      const mockInv = {
        _id: new mongoose.Types.ObjectId(),
        product: new mongoose.Types.ObjectId(),
        variantSku: 'SAN-100',
        quantity: 20,
        reservedQuantity: 5,
        lowStockThreshold: 5,
        status: 'in_stock',
        history: [],
        calculateStatus: jest.fn(function () {
          this.status = this.quantity - this.reservedQuantity > 5 ? 'in_stock' : 'low_stock';
        }),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Inventory, 'findById').mockResolvedValue(mockInv);
      jest.spyOn(Product, 'updateOne').mockResolvedValue({});

      const result = await inventoryService.updateQuantity(mockInv._id.toString(), 40, 'Restock delivery');

      expect(result.quantity).toBe(40);
      expect(mockInv.quantity).toBe(40);
      expect(mockInv.history.length).toBe(1);
      expect(mockInv.history[0].action).toBe('set_quantity');
      expect(mockInv.save).toHaveBeenCalled();
    });

    test('updateQuantity rejects setting physical stock below current reserved stock', async () => {
      const mockInv = {
        _id: new mongoose.Types.ObjectId(),
        quantity: 20,
        reservedQuantity: 15,
      };

      jest.spyOn(Inventory, 'findById').mockResolvedValue(mockInv);

      await expect(
        inventoryService.updateQuantity(mockInv._id.toString(), 10, 'Invalid decrement')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('Stock Adjustments & Prevention of Negative Stock', () => {
    test('adjustStock prevents adjustment resulting in negative stock', async () => {
      const mockInv = {
        variantSku: 'SAN-100',
        quantity: 10,
        reservedQuantity: 2,
      };

      jest.spyOn(Inventory, 'findOne').mockResolvedValue(mockInv);

      await expect(
        inventoryService.adjustStock({
          variantSku: 'SAN-100',
          adjustment: -15,
          reason: 'Damaged bottles',
        })
      ).rejects.toThrow(ApiError);
    });

    test('adjustStock prevents physical stock falling below reserved quantity', async () => {
      const mockInv = {
        variantSku: 'SAN-100',
        quantity: 10,
        reservedQuantity: 8,
      };

      jest.spyOn(Inventory, 'findOne').mockResolvedValue(mockInv);

      await expect(
        inventoryService.adjustStock({
          variantSku: 'SAN-100',
          adjustment: -5,
          reason: 'Inventory loss',
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('Atomic Stock Reservation & Release', () => {
    test('reserveStock atomically reserves available quantity', async () => {
      const updatedInv = {
        _id: new mongoose.Types.ObjectId(),
        variantSku: 'SAN-100',
        quantity: 20,
        reservedQuantity: 5,
        lowStockThreshold: 5,
        history: [],
        calculateStatus: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Inventory, 'findOneAndUpdate').mockResolvedValue(updatedInv);

      const items = [{ variantSku: 'SAN-100', quantity: 2 }];
      const result = await inventoryService.reserveStock(items, 'ORD-2026-TEST01');

      expect(result.length).toBe(1);
      expect(result[0].variantSku).toBe('SAN-100');
      expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          variantSku: 'SAN-100',
        }),
        expect.anything(),
        expect.anything()
      );
    });

    test('reserveStock throws error and rolls back when stock is insufficient', async () => {
      // First item succeeds, second item fails
      const updatedFirst = {
        _id: new mongoose.Types.ObjectId(),
        variantSku: 'SAN-100',
        quantity: 10,
        reservedQuantity: 2,
        history: [],
        calculateStatus: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Inventory, 'findOneAndUpdate')
        .mockResolvedValueOnce(updatedFirst)
        .mockResolvedValueOnce(null); // Insufficient stock for second item

      const items = [
        { variantSku: 'SAN-100', quantity: 1 },
        { variantSku: 'OUD-50', quantity: 99 },
      ];

      await expect(inventoryService.reserveStock(items, 'ORD-2026-TEST02')).rejects.toThrow(
        ApiError
      );
    });

    test('releaseReservation releases reserved quantity atomically', async () => {
      const updatedInv = {
        _id: new mongoose.Types.ObjectId(),
        variantSku: 'SAN-100',
        quantity: 20,
        reservedQuantity: 3,
        history: [],
        calculateStatus: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Inventory, 'findOneAndUpdate').mockResolvedValue(updatedInv);

      const items = [{ variantSku: 'SAN-100', quantity: 2 }];
      const result = await inventoryService.releaseReservation(items, 'ORD-2026-TEST01', 'Order cancelled');

      expect(result.length).toBe(1);
      expect(Inventory.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          variantSku: 'SAN-100',
          reservedQuantity: { $gte: 2 },
        }),
        expect.objectContaining({
          $inc: { reservedQuantity: -2 },
        }),
        expect.anything()
      );
    });
  });
});
