const mongoose = require('mongoose');
const ordersService = require('../../src/modules/orders/orders.service');
const Order = require('../../src/modules/orders/orders.model');
const Product = require('../../src/modules/products/products.model');
const Customer = require('../../src/modules/customers/customers.model');
const Coupon = require('../../src/modules/coupons/coupons.model');
const Settings = require('../../src/modules/settings/settings.model');
const inventoryService = require('../../src/modules/inventory/inventory.service');
const ApiError = require('../../src/utils/apiError');

describe('Phase 6 Checkout & Payment Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const sampleAddress = {
    fullName: 'Alexander Wright',
    phone: '+1 555-0199',
    addressLine1: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'OR',
    postalCode: '97477',
    country: 'US',
  };

  const sampleProduct = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Royal Ambergris Extrait',
    status: 'active',
    price: 320,
    sku: 'ROYAL-AMB',
    variants: [{ size: '100ml', price: 320, sku: 'ROYAL-AMB-100', status: 'active' }],
    images: [{ url: 'https://cdn.example.com/ambergris.jpg', isPrimary: true }],
  };

  describe('Payment Method Enforcement & Settings Validation', () => {
    test('rejects unsupported payment methods like stripe, card, paypal with 400', async () => {
      const orderInput = {
        customer: { name: 'Alexander', email: 'alex@example.com' },
        items: [{ productId: sampleProduct._id.toString(), sku: 'ROYAL-AMB-100', quantity: 1 }],
        shippingAddress: sampleAddress,
        paymentMethod: 'stripe',
      };

      await expect(ordersService.createOrder(orderInput)).rejects.toThrow(ApiError);
      await expect(ordersService.createOrder(orderInput)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("Invalid payment method 'stripe'"),
      });
    });

    test('rejects cash_on_delivery when disabled in store settings', async () => {
      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          payment: { cod: { enabled: false } },
        }),
      });

      const orderInput = {
        customer: { name: 'Alexander', email: 'alex@example.com' },
        items: [{ productId: sampleProduct._id.toString(), sku: 'ROYAL-AMB-100', quantity: 1 }],
        shippingAddress: sampleAddress,
        paymentMethod: 'cash_on_delivery',
      };

      await expect(ordersService.createOrder(orderInput)).rejects.toThrow(ApiError);
      await expect(ordersService.createOrder(orderInput)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Cash on Delivery is currently disabled'),
      });
    });

    test('rejects bank_transfer when disabled in store settings', async () => {
      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          payment: { bankTransfer: { enabled: false } },
        }),
      });

      const orderInput = {
        customer: { name: 'Alexander', email: 'alex@example.com' },
        items: [{ productId: sampleProduct._id.toString(), sku: 'ROYAL-AMB-100', quantity: 1 }],
        shippingAddress: sampleAddress,
        paymentMethod: 'bank_transfer',
      };

      await expect(ordersService.createOrder(orderInput)).rejects.toThrow(ApiError);
      await expect(ordersService.createOrder(orderInput)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Bank Transfer is currently disabled'),
      });
    });
  });

  describe('Cash on Delivery Checkout Workflow', () => {
    test('creates cash_on_delivery order with pending status and reserved stock', async () => {
      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          payment: { cod: { enabled: true } },
          shipping: { freeShippingThreshold: 150, standardShippingFee: 15 },
        }),
      });
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue([]);
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);
      jest.spyOn(Customer, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      let createdDoc = null;
      jest.spyOn(Order, 'create').mockImplementation((data) => {
        createdDoc = { _id: new mongoose.Types.ObjectId(), ...data };
        return Promise.resolve(createdDoc);
      });

      const orderInput = {
        customer: { name: 'Alexander Wright', email: 'alex@example.com' },
        items: [{ productId: sampleProduct._id.toString(), sku: 'ROYAL-AMB-100', quantity: 1 }],
        shippingAddress: sampleAddress,
        paymentMethod: 'cash_on_delivery',
      };

      const result = await ordersService.createOrder(orderInput);

      expect(result.paymentMethod).toBe('cash_on_delivery');
      expect(result.orderStatus).toBe('pending');
      expect(result.paymentStatus).toBe('pending');
      expect(result.paymentInfo.provider).toBe('cash_on_delivery');
      expect(result.subtotal).toBe(320);
      expect(result.shippingFee).toBe(0); // $320 >= $150
      expect(result.total).toBe(320);
      expect(inventoryService.reserveStock).toHaveBeenCalledWith(
        [{ productId: sampleProduct._id, variantSku: 'ROYAL-AMB-100', quantity: 1 }],
        expect.any(String),
        'alex@example.com'
      );
    });
  });

  describe('Bank Transfer Workflow (Creation, Proof Upload, Approval, Rejection)', () => {
    test('creates bank_transfer order with awaiting_payment_verification and pending_verification', async () => {
      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          payment: { bankTransfer: { enabled: true } },
          shipping: { freeShippingThreshold: 500, standardShippingFee: 20 },
        }),
      });
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue([]);
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);
      jest.spyOn(Customer, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      let createdDoc = null;
      jest.spyOn(Order, 'create').mockImplementation((data) => {
        createdDoc = { _id: new mongoose.Types.ObjectId(), ...data };
        return Promise.resolve(createdDoc);
      });

      const orderInput = {
        customer: { name: 'Alexander Wright', email: 'alex@example.com' },
        items: [{ productId: sampleProduct._id.toString(), sku: 'ROYAL-AMB-100', quantity: 1 }],
        shippingAddress: sampleAddress,
        paymentMethod: 'bank_transfer',
      };

      const result = await ordersService.createOrder(orderInput);

      expect(result.paymentMethod).toBe('bank_transfer');
      expect(result.orderStatus).toBe('awaiting_payment_verification');
      expect(result.paymentStatus).toBe('pending_verification');
      expect(result.paymentInfo.provider).toBe('bank_transfer');
      expect(result.shippingFee).toBe(20); // $320 < $500 threshold
      expect(result.total).toBe(340);
    });

    test('customer can submit payment proof for bank_transfer order', async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-BT1',
        paymentMethod: 'bank_transfer',
        orderStatus: 'awaiting_payment_verification',
        paymentStatus: 'pending_verification',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockOrder);

      const proofData = {
        url: 'https://storage.example.com/receipts/proof123.pdf',
        mimeType: 'application/pdf',
        originalName: 'bank_slip.pdf',
      };

      const result = await ordersService.submitPaymentProof('ORD-2026-BT1', proofData);

      expect(result.paymentProof.url).toBe(proofData.url);
      expect(result.paymentProof.mimeType).toBe('application/pdf');
      expect(result.orderStatus).toBe('awaiting_payment_verification');
      expect(result.paymentStatus).toBe('pending_verification');
      expect(mockOrder.save).toHaveBeenCalled();
    });

    test('admin can approve bank transfer payment idempotently', async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-BT2',
        paymentMethod: 'bank_transfer',
        orderStatus: 'awaiting_payment_verification',
        paymentStatus: 'pending_verification',
        paymentInfo: {},
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockOrder);

      const adminUser = { id: new mongoose.Types.ObjectId(), email: 'admin@houseperfume.com' };
      const approved = await ordersService.approveBankTransferPayment(mockOrder._id.toString(), adminUser);

      expect(approved.paymentStatus).toBe('paid');
      expect(approved.orderStatus).toBe('confirmed');
      expect(approved.paymentVerification.verifiedBy).toBe(adminUser.id);
      expect(approved.paymentInfo.paidAt).toBeDefined();

      // Idempotency: calling again returns same without error
      const repeat = await ordersService.approveBankTransferPayment(mockOrder._id.toString(), adminUser);
      expect(repeat.paymentStatus).toBe('paid');
    });

    test('admin rejection of bank transfer releases inventory reservation and reverts coupon', async () => {
      const couponId = new mongoose.Types.ObjectId();
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-BT3',
        paymentMethod: 'bank_transfer',
        orderStatus: 'awaiting_payment_verification',
        paymentStatus: 'pending_verification',
        coupon: couponId,
        items: [
          {
            product: sampleProduct._id,
            sku: 'ROYAL-AMB-100',
            quantity: 2,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockOrder);
      jest.spyOn(inventoryService, 'releaseReservation').mockResolvedValue([]);
      jest.spyOn(Coupon, 'updateOne').mockResolvedValue({ modifiedCount: 1 });

      const adminUser = { id: new mongoose.Types.ObjectId(), email: 'admin@houseperfume.com' };
      const rejected = await ordersService.rejectBankTransferPayment(
        mockOrder._id.toString(),
        'Reference number not found in bank statement',
        adminUser
      );

      expect(rejected.paymentStatus).toBe('rejected');
      expect(rejected.orderStatus).toBe('payment_rejected');
      expect(rejected.paymentVerification.rejectionReason).toBe(
        'Reference number not found in bank statement'
      );
      expect(inventoryService.releaseReservation).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ variantSku: 'ROYAL-AMB-100', quantity: 2 }),
        ]),
        'ORD-2026-BT3',
        expect.stringContaining('Bank transfer payment rejected'),
        'admin@houseperfume.com'
      );
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        { _id: couponId },
        { $inc: { usageCount: -1 } }
      );
    });
  });

  describe('Idempotency Key Protection', () => {
    test('returns existing order when same idempotencyKey is supplied', async () => {
      const existingOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-IDEM1',
        idempotencyKey: 'key_xyz_123',
        total: 320,
      };

      jest.spyOn(Order, 'findOne').mockResolvedValue(existingOrder);
      jest.spyOn(inventoryService, 'reserveStock');

      const result = await ordersService.createOrder({
        idempotencyKey: 'key_xyz_123',
        items: [{ productId: sampleProduct._id.toString(), sku: 'ROYAL-AMB-100', quantity: 1 }],
      });

      expect(result.orderNumber).toBe('ORD-2026-IDEM1');
      expect(inventoryService.reserveStock).not.toHaveBeenCalled();
    });
  });
});
