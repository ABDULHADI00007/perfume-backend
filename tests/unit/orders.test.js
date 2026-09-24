const mongoose = require('mongoose');
const ordersService = require('../../src/modules/orders/orders.service');
const Order = require('../../src/modules/orders/orders.model');
const Product = require('../../src/modules/products/products.model');
const Customer = require('../../src/modules/customers/customers.model');
const Coupon = require('../../src/modules/coupons/coupons.model');
const Settings = require('../../src/modules/settings/settings.model');
const inventoryService = require('../../src/modules/inventory/inventory.service');
const ApiError = require('../../src/utils/apiError');

describe('Orders Business Logic & Lifecycle Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Settings, 'findOne').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        payment: { cod: { enabled: true }, bankTransfer: { enabled: true } },
        shipping: { freeShippingThreshold: 150, standardShippingFee: 15 },
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Order Creation & Server-Side Price Calculation', () => {
    test('creates order with verified server-side totals, discount, and snapshots', async () => {
      const mockProductId = new mongoose.Types.ObjectId();
      const mockProduct = {
        _id: mockProductId,
        name: 'Oud Noir',
        status: 'active',
        price: 200,
        sku: 'OUD-NOIR',
        variants: [{ size: '100ml', price: 200, sku: 'OUD-NOIR-100', status: 'active' }],
        images: [{ url: 'https://example.com/oud.jpg', isPrimary: true }],
      };

      const mockCoupon = {
        _id: new mongoose.Types.ObjectId(),
        code: 'LUXE10',
        status: 'active',
        discountType: 'percentage',
        discountValue: 10,
        minimumOrderAmount: 100,
        usageLimit: 100,
        usageCount: 5,
        startsAt: new Date(Date.now() - 10000),
        expiresAt: new Date(Date.now() + 100000),
      };

      const mockCustomer = {
        _id: new mongoose.Types.ObjectId(),
        email: 'customer@example.com',
        totalOrdersCount: 0,
        totalSpent: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);
      jest.spyOn(Coupon, 'findOne').mockResolvedValue(mockCoupon);
      jest.spyOn(Coupon, 'findOneAndUpdate').mockResolvedValue(mockCoupon);
      jest.spyOn(Coupon, 'updateOne').mockResolvedValue({});
      jest.spyOn(Customer, 'findOne').mockResolvedValue(mockCustomer);
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue([{ variantSku: 'OUD-NOIR-100' }]);

      let savedOrderPayload = null;
      jest.spyOn(Order, 'create').mockImplementation((data) => {
        savedOrderPayload = data;
        return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data });
      });

      const orderInput = {
        customer: { name: 'Jane Doe', email: 'customer@example.com', phone: '+123456789' },
        items: [{ productId: mockProductId.toString(), sku: 'OUD-NOIR-100', quantity: 2 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '+123456789',
          addressLine1: '123 Fragrance Blvd',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        paymentMethod: 'cash_on_delivery',
        couponCode: 'LUXE10',
      };

      const result = await ordersService.createOrder(orderInput);

      expect(result.orderNumber).toBeDefined();
      expect(savedOrderPayload.subtotal).toBe(400);
      // Discount = 10% of $400 = $40
      // Subtotal > $150 -> Free Shipping ($0)
      // Total = $400 - $40 + $0 = $360
      expect(savedOrderPayload.subtotal).toBe(400);
      expect(savedOrderPayload.discount).toBe(40);
      expect(savedOrderPayload.shippingFee).toBe(0);
      expect(savedOrderPayload.total).toBe(360);
      expect(savedOrderPayload.orderNumber).toMatch(/^ORD-\d{4}-/);
      expect(savedOrderPayload.items[0].name).toBe('Oud Noir');
      expect(savedOrderPayload.items[0].unitPrice).toBe(200);
      expect(savedOrderPayload.items[0].totalPrice).toBe(400);
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ variantSku: 'OUD-NOIR-100', quantity: 2 })]),
        expect.any(String),
        expect.any(String)
      );
    });

    test('rejects order with inactive product', async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Inactive Oud',
        status: 'draft',
        price: 100,
      };

      jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

      const orderInput = {
        customer: { name: 'Jane Doe', email: 'customer@example.com' },
        items: [{ productId: mockProduct._id.toString(), sku: 'INA-01', quantity: 1 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '123',
          addressLine1: 'Road',
          city: 'City',
          state: 'State',
          postalCode: '12345',
        },
        paymentMethod: 'cash_on_delivery',
      };

      await expect(ordersService.createOrder(orderInput)).rejects.toThrow(ApiError);
    });

    test('rejects order with non-existent variant SKU', async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Rose Velvet',
        status: 'active',
        price: 150,
        variants: [{ size: '50ml', sku: 'RV-50', price: 150, status: 'active' }],
      };

      jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

      const orderInput = {
        customer: { name: 'Jane Doe', email: 'customer@example.com' },
        items: [{ productId: mockProduct._id.toString(), sku: 'RV-100-NONEXISTENT', quantity: 1 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '123',
          addressLine1: 'Road',
          city: 'City',
          state: 'State',
          postalCode: '12345',
        },
        paymentMethod: 'cash_on_delivery',
      };

      await expect(ordersService.createOrder(orderInput)).rejects.toThrow(ApiError);
    });
  });

  describe('Order Lifecycle & Status Transitions', () => {
    test('allows valid lifecycle transition and commits inventory on shipment', async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-T1',
        orderStatus: 'confirmed',
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            sku: 'OUD-100',
            quantity: 1,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockOrder);
      jest.spyOn(inventoryService, 'commitStockDeduction').mockResolvedValue([]);

      const result = await ordersService.updateOrderStatus(
        mockOrder._id.toString(),
        'processing',
        'Preparing parcel'
      );

      expect(result.orderStatus).toBe('processing');
    });

    test('blocks invalid status transition (e.g. delivered -> processing)', async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-T2',
        orderStatus: 'delivered',
        items: [],
      };

      jest.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockOrder);

      await expect(
        ordersService.updateOrderStatus(mockOrder._id.toString(), 'processing')
      ).rejects.toThrow(ApiError);
    });

    test('cancelOrder releases reserved stock and is idempotent', async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-T3',
        orderStatus: 'confirmed',
        paymentStatus: 'pending',
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            sku: 'OUD-100',
            quantity: 1,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockOrder);
      jest.spyOn(inventoryService, 'releaseReservation').mockResolvedValue([]);

      const cancelled = await ordersService.cancelOrder(mockOrder._id.toString(), 'Customer request');

      expect(cancelled.orderStatus).toBe('cancelled');
      expect(inventoryService.releaseReservation).toHaveBeenCalledTimes(1);

      // Second call (idempotency check)
      const secondCall = await ordersService.cancelOrder(mockOrder._id.toString(), 'Repeat cancel');
      expect(secondCall.orderStatus).toBe('cancelled');
      expect(inventoryService.releaseReservation).toHaveBeenCalledTimes(1); // Not called again!
    });
  });
});
