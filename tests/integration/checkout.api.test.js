const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const Order = require('../../src/modules/orders/orders.model');
const Product = require('../../src/modules/products/products.model');
const Customer = require('../../src/modules/customers/customers.model');
const Settings = require('../../src/modules/settings/settings.model');
const inventoryService = require('../../src/modules/inventory/inventory.service');

describe('Phase 6 Checkout & Payment API Integration Suite', () => {
  const adminToken = jwt.sign(
    { id: 'admin1', email: 'admin@perfume.com', role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const sampleProductId = new mongoose.Types.ObjectId();
  const sampleProduct = {
    _id: sampleProductId,
    name: 'Santale Imperial Extrait',
    status: 'active',
    price: 250,
    sku: 'SAN-IMP',
    variants: [{ size: '100ml', price: 250, sku: 'SAN-IMP-100', status: 'active' }],
    images: [{ url: 'https://cdn.example.com/santal.jpg', isPrimary: true }],
  };

  const sampleSettings = {
    _id: 'settings-1',
    store: { name: 'House Perfume Paris', supportEmail: 'contact@houseperfume.com' },
    currency: { code: 'USD', symbol: '$' },
    shipping: { freeShippingThreshold: 150, standardShippingFee: 15 },
    tax: { enabled: false, rate: 0 },
    payment: {
      cod: {
        enabled: true,
        displayName: 'Cash on Delivery',
        instructions: 'Pay cash upon receipt of order.',
      },
      bankTransfer: {
        enabled: true,
        displayName: 'Direct Bank Wire',
        instructions: 'Please transfer to our business account.',
        bankDetails: {
          bankName: 'Banque Nationale de Paris',
          accountName: 'House Perfume SAS',
          accountNumber: 'FR7630006000011234567890189',
          routingNumber: 'BNPAFR22',
          swiftCode: 'BNPAFR22XXX',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === 'admin1') {
        return Promise.resolve({
          _id: 'admin1',
          email: 'admin@perfume.com',
          role: 'admin',
          status: 'active',
        });
      }
      return Promise.resolve(null);
    });

    jest.spyOn(Settings, 'findOne').mockReturnValue({
      lean: jest.fn().mockResolvedValue(sampleSettings),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/settings (Public Settings with Bank Details)', () => {
    test('returns public store settings including bank transfer details', async () => {
      const res = await request(app).get('/api/v1/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.bankTransfer.bankDetails.bankName).toBe('Banque Nationale de Paris');
      expect(res.body.data.payment.bankTransfer.bankDetails.accountNumber).toBe('FR7630006000011234567890189');
      expect(res.body.data.payment.cod.enabled).toBe(true);
    });
  });

  describe('POST /api/v1/orders (Storefront Checkout)', () => {
    test('rejects credit card or stripe payment method with 400', async () => {
      const payload = {
        customer: { name: 'Customer Test', email: 'test@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'SAN-IMP-100', quantity: 1 }],
        shippingAddress: {
          fullName: 'Customer Test',
          phone: '+1 555-1234',
          addressLine1: '123 Avenue',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
        },
        paymentMethod: 'stripe',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('successfully places Cash on Delivery order', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue([]);
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);
      jest.spyOn(Customer, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      const mockCreatedOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-COD1',
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        subtotal: 250,
        shippingFee: 0,
        total: 250,
      };
      jest.spyOn(Order, 'create').mockResolvedValue(mockCreatedOrder);

      const payload = {
        customer: { name: 'Customer Test', email: 'test@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'SAN-IMP-100', quantity: 1 }],
        shippingAddress: {
          fullName: 'Customer Test',
          phone: '+1 555-1234',
          addressLine1: '123 Avenue',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
        },
        paymentMethod: 'cash_on_delivery',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBe('ORD-2026-COD1');
      expect(res.body.data.paymentMethod).toBe('cash_on_delivery');
      expect(res.body.data.orderStatus).toBe('pending');
      expect(inventoryService.reserveStock).toHaveBeenCalled();
    });

    test('successfully places Bank Transfer order with awaiting_payment_verification status', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue([]);
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);
      jest.spyOn(Customer, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      const mockCreatedOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-BT1',
        paymentMethod: 'bank_transfer',
        paymentStatus: 'pending_verification',
        orderStatus: 'awaiting_payment_verification',
        subtotal: 250,
        shippingFee: 0,
        total: 250,
      };
      jest.spyOn(Order, 'create').mockResolvedValue(mockCreatedOrder);

      const payload = {
        customer: { name: 'Customer Test', email: 'test@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'SAN-IMP-100', quantity: 1 }],
        shippingAddress: {
          fullName: 'Customer Test',
          phone: '+1 555-1234',
          addressLine1: '123 Avenue',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
        },
        paymentMethod: 'bank_transfer',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentMethod).toBe('bank_transfer');
      expect(res.body.data.orderStatus).toBe('awaiting_payment_verification');
      expect(res.body.data.paymentStatus).toBe('pending_verification');
    });
  });

  describe('POST /api/v1/orders/:orderNumberOrId/payment-proof (Proof Submission)', () => {
    test('allows customer to submit payment proof for bank transfer order', async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-2026-BT1',
        paymentMethod: 'bank_transfer',
        orderStatus: 'awaiting_payment_verification',
        paymentStatus: 'pending_verification',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Order, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOrder),
        }),
      });

      const res = await request(app)
        .post('/api/v1/orders/ORD-2026-BT1/payment-proof')
        .send({
          url: 'https://storage.example.com/receipts/transfer_proof.jpg',
          mimeType: 'image/jpeg',
          originalName: 'transfer_receipt.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentProof.url).toBe('https://storage.example.com/receipts/transfer_proof.jpg');
    });
  });

  describe('Admin Verification: Approve & Reject Endpoints', () => {
    test('admin can approve bank transfer payment', async () => {
      const orderId = new mongoose.Types.ObjectId().toString();
      const mockOrder = {
        _id: orderId,
        orderNumber: 'ORD-2026-BT1',
        paymentMethod: 'bank_transfer',
        orderStatus: 'awaiting_payment_verification',
        paymentStatus: 'pending_verification',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Order, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOrder),
        }),
      });

      const res = await request(app)
        .post(`/api/v1/orders/${orderId}/payment/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentStatus).toBe('paid');
      expect(res.body.data.orderStatus).toBe('confirmed');
    });

    test('admin can reject bank transfer payment and release stock', async () => {
      const orderId = new mongoose.Types.ObjectId().toString();
      const mockOrder = {
        _id: orderId,
        orderNumber: 'ORD-2026-BT1',
        paymentMethod: 'bank_transfer',
        orderStatus: 'awaiting_payment_verification',
        paymentStatus: 'pending_verification',
        items: [{ product: sampleProductId, sku: 'SAN-IMP-100', quantity: 1 }],
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Order, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOrder),
        }),
      });
      jest.spyOn(inventoryService, 'releaseReservation').mockResolvedValue([]);

      const res = await request(app)
        .post(`/api/v1/orders/${orderId}/payment/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Payment transfer reference not found in bank account' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentStatus).toBe('rejected');
      expect(res.body.data.orderStatus).toBe('payment_rejected');
      expect(inventoryService.releaseReservation).toHaveBeenCalled();
    });
  });
});
