const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const Order = require('../../src/modules/orders/orders.model');
const Product = require('../../src/modules/products/products.model');
const Customer = require('../../src/modules/customers/customers.model');
const Settings = require('../../src/modules/settings/settings.model');
const Inventory = require('../../src/modules/inventory/inventory.model');
const inventoryService = require('../../src/modules/inventory/inventory.service');

describe('Priority 0 Security Remediation Test Suite (SEC-VULN-02, SEC-VULN-03, SEC-VULN-04)', () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const adminToken = jwt.sign(
    { id: adminId, email: 'admin@perfume.com', role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const customerAId = new mongoose.Types.ObjectId();
  const customerBId = new mongoose.Types.ObjectId();

  const sampleProductId = new mongoose.Types.ObjectId();
  const sampleProduct = {
    _id: sampleProductId,
    name: 'Royale Imperial Extrait',
    status: 'active',
    price: 300,
    sku: 'ROY-IMP',
    variants: [{ size: '50ml', price: 300, sku: 'ROY-IMP-50', status: 'active' }],
    images: [{ url: '/images/perfumes/royale.png', isPrimary: true }],
  };

  const sampleSettings = {
    _id: 'settings-sec',
    store: { name: 'Soulmate Scents', supportEmail: 'concierge@soulmatescents.com' },
    currency: { code: 'PKR', symbol: 'Rs' },
    shipping: { freeShippingThreshold: 5000, standardShippingFee: 250 },
    tax: { enabled: false, rate: 0 },
    payment: {
      cod: { enabled: true },
      bankTransfer: {
        enabled: true,
        bankName: 'Meezan Bank',
        accountTitle: 'Soulmate Scents Luxury Ltd',
        accountNumber: '010203040506',
        iban: 'PK36MEZN0001020304050601',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(User, 'findById').mockImplementation((id) => {
      if (id === adminId) {
        return Promise.resolve({
          _id: adminId,
          email: 'admin@perfume.com',
          role: 'admin',
          status: 'active',
        });
      }
      if (id === customerAId.toString()) {
        return Promise.resolve({
          _id: customerAId,
          email: 'customerA@example.com',
          role: 'customer',
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

  describe('SEC-VULN-02: Order Confirmation & Customer PII Protection', () => {
    const validGuestToken = crypto.randomBytes(32).toString('hex');
    const attackerToken = crypto.randomBytes(32).toString('hex');

    const mockOrderWithToken = {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: 'ORD-SEC-001',
      orderAccessToken: validGuestToken,
      customer: customerAId,
      customerSnapshot: {
        name: 'VIP Client',
        email: 'vipclient@luxury.com',
        phone: '+92 333 1234567',
      },
      shippingAddress: {
        fullName: 'VIP Client',
        phone: '+92 333 1234567',
        addressLine1: 'Villa 42 Defense Phase 6',
        city: 'Lahore',
        country: 'Pakistan',
      },
      items: [
        {
          name: 'Royale Imperial Extrait',
          sku: 'ROY-IMP-50',
          quantity: 1,
          unitPrice: 300,
          totalPrice: 300,
        },
      ],
      subtotal: 300,
      discount: 0,
      shippingFee: 250,
      tax: 0,
      total: 550,
      currency: 'PKR',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending_verification',
      orderStatus: 'awaiting_payment_verification',
      createdAt: new Date(),
    };

    test('rejects unauthenticated guessable order request without access token (403)', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOrderWithToken),
        }),
      });

      const res = await request(app).get('/api/v1/orders/confirmation/ORD-SEC-001');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    test('rejects invalid or wrong order access token (403)', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOrderWithToken),
        }),
      });

      const res = await request(app)
        .get('/api/v1/orders/confirmation/ORD-SEC-001')
        .query({ token: attackerToken });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('allows access when valid guest order access token is provided', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOrderWithToken),
        }),
      });

      const res = await request(app)
        .get('/api/v1/orders/confirmation/ORD-SEC-001')
        .query({ token: validGuestToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBe('ORD-SEC-001');

      // Verify sensitive Customer PII is masked
      expect(res.body.data.customerSnapshot.email).not.toBe('vipclient@luxury.com');
      expect(res.body.data.customerSnapshot.email).toContain('***');
      expect(res.body.data.customerSnapshot.phone).not.toBe('+92 333 1234567');
      expect(res.body.data.customerSnapshot.phone).toContain('****');
      expect(res.body.data.shippingAddress.addressLine1).toContain('****');
      // Token itself is not leaked back in confirmation response
      expect(res.body.data.orderAccessToken).toBeUndefined();
    });

    test('allows authorized admin to retrieve order confirmation without guest token', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOrderWithToken),
        }),
      });

      const res = await request(app)
        .get('/api/v1/orders/confirmation/ORD-SEC-001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBe('ORD-SEC-001');
    });

    test('customer B cannot access customer A order without token', async () => {
      const customerBToken = jwt.sign(
        { id: customerBId.toString(), email: 'customerB@example.com', role: 'customer' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: customerBId,
        email: 'customerB@example.com',
        role: 'customer',
        status: 'active',
      });

      jest.spyOn(Order, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOrderWithToken),
        }),
      });

      const res = await request(app)
        .get('/api/v1/orders/confirmation/ORD-SEC-001')
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('SEC-VULN-03: Bank Transfer Payment Proof Security', () => {
    const validGuestToken = crypto.randomBytes(32).toString('hex');
    const attackerToken = crypto.randomBytes(32).toString('hex');

    const mockBtOrder = {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: 'ORD-SEC-BT1',
      orderAccessToken: validGuestToken,
      customer: customerAId,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending_verification',
      orderStatus: 'awaiting_payment_verification',
      save: jest.fn().mockResolvedValue(true),
    };

    test('rejects payment proof submission without authentication or valid guest token (403)', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBtOrder),
        }),
      });

      const res = await request(app)
        .post('/api/v1/orders/ORD-SEC-BT1/payment-proof')
        .send({
          url: 'https://trusted.cdn.com/receipt.jpg',
          token: attackerToken,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    test('allows valid guest token to submit payment proof', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBtOrder),
        }),
      });

      const res = await request(app)
        .post('/api/v1/orders/ORD-SEC-BT1/payment-proof')
        .send({
          url: 'https://trusted.cdn.com/receipt.jpg',
          token: validGuestToken,
          mimeType: 'image/jpeg',
          originalName: 'bank_slip.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockBtOrder.paymentStatus).toBe('pending_verification');
      expect(mockBtOrder.orderStatus).toBe('awaiting_payment_verification');
      // Submitting proof does NOT mark order as paid
      expect(mockBtOrder.paymentStatus).not.toBe('paid');
    });

    test('accepts base64 receipt file upload with genuine JPEG signature', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBtOrder),
        }),
      });

      // Genuine JPEG magic bytes: FF D8 FF E0 00 10 4A 46 49 46 00 01
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const base64Data = jpegBuffer.toString('base64');

      const res = await request(app)
        .post('/api/v1/orders/ORD-SEC-BT1/payment-proof')
        .send({
          fileData: base64Data,
          token: validGuestToken,
          originalName: 'receipt.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockBtOrder.paymentProof.url).toMatch(/^\/uploads\/receipts\/receipt_ORD-SEC-BT1_/);
    });

    test('rejects fake image file upload with invalid magic bytes (400)', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBtOrder),
        }),
      });

      // Script payload masquerading as an image
      const fakeBuffer = Buffer.from('<script>alert("xss")</script>');
      const base64Data = fakeBuffer.toString('base64');

      const res = await request(app)
        .post('/api/v1/orders/ORD-SEC-BT1/payment-proof')
        .send({
          fileData: base64Data,
          token: validGuestToken,
          originalName: 'exploit.jpg',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only verified JPEG, PNG, WebP, or PDF');
    });

    test('rejects dangerous URL schemes such as javascript: (400)', async () => {
      jest.spyOn(Order, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBtOrder),
        }),
      });

      const res = await request(app)
        .post('/api/v1/orders/ORD-SEC-BT1/payment-proof')
        .send({
          url: 'javascript:alert(document.cookie)',
          token: validGuestToken,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('SEC-VULN-04: Checkout Price Manipulation & Phantom Inventory Resistance', () => {
    test('strictly rejects checkout with unknown/non-existent product (400)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(null);
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);

      const payload = {
        customer: { name: 'Attacker', email: 'attacker@fraud.com' },
        items: [{ productId: 'non_existent_perfume_id', sku: 'FAKE-SKU-99', quantity: 1 }],
        shippingAddress: {
          fullName: 'Attacker',
          phone: '+92 300 0000000',
          addressLine1: 'Unknown St',
          city: 'Karachi',
          postalCode: '74000',
        },
        paymentMethod: 'cash_on_delivery',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found or no longer available');
    });

    test('strictly rejects client-submitted prices and recalculates from DB product price', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue([]);
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);
      jest.spyOn(Customer, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      let savedData = null;
      jest.spyOn(Order, 'create').mockImplementation((data) => {
        savedData = data;
        return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data });
      });

      const payload = {
        customer: { name: 'Jane Doe', email: 'jane@example.com' },
        // Attempting to send manipulated price: 1 PKR instead of real 300 PKR
        items: [
          {
            productId: sampleProductId.toString(),
            sku: 'ROY-IMP-50',
            quantity: 2,
            price: 1,
            unitPrice: 1,
            totalPrice: 2,
          },
        ],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '+92 333 1112233',
          addressLine1: 'Main Boulevard Gulberg',
          city: 'Lahore',
          postalCode: '54000',
        },
        paymentMethod: 'cash_on_delivery',
        subtotal: 2,
        total: 2,
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Recalculated from DB price (300 * 2 = 600)
      expect(savedData.subtotal).toBe(600);
      expect(savedData.items[0].unitPrice).toBe(300);
      expect(savedData.items[0].totalPrice).toBe(600);
    });

    test('rejects checkout with negative or zero quantity (400)', async () => {
      const payloadZero = {
        customer: { name: 'Jane Doe', email: 'jane@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'ROY-IMP-50', quantity: 0 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '+92 333 1112233',
          addressLine1: 'Street 1',
          city: 'Lahore',
          postalCode: '54000',
        },
        paymentMethod: 'cash_on_delivery',
      };

      const res = await request(app).post('/api/v1/orders').send(payloadZero);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('rejects checkout with excessive quantity over 50 units (400)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);

      const payloadExcess = {
        customer: { name: 'Jane Doe', email: 'jane@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'ROY-IMP-50', quantity: 9999 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '+92 333 1112233',
          addressLine1: 'Street 1',
          city: 'Lahore',
          postalCode: '54000',
        },
        paymentMethod: 'cash_on_delivery',
      };

      const res = await request(app).post('/api/v1/orders').send(payloadExcess);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Quantity must be an integer between 1 and 50');
    });

    test('missing inventory record does not create phantom stock and rejects order (400)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);
      // Simulate inventory findOne returning null (item not tracked in inventory)
      jest.spyOn(Inventory, 'findOneAndUpdate').mockResolvedValue(null);
      jest.spyOn(Inventory, 'findOne').mockResolvedValue(null);
      const inventoryCreateSpy = jest.spyOn(Inventory, 'create');

      const payload = {
        customer: { name: 'Jane Doe', email: 'jane@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'ROY-IMP-50', quantity: 1 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '+92 333 1112233',
          addressLine1: 'Street 1',
          city: 'Lahore',
          postalCode: '54000',
        },
        paymentMethod: 'cash_on_delivery',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('does not exist in inventory');
      // Verify NO phantom inventory was created
      expect(inventoryCreateSpy).not.toHaveBeenCalled();
    });

    test('insufficient inventory rejects checkout without overselling (400)', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(Customer, 'findOne').mockResolvedValue(null);

      // Inventory exists with 2 total, 2 reserved -> 0 available
      const existingInventory = {
        variantSku: 'ROY-IMP-50',
        quantity: 2,
        reservedQuantity: 2,
      };
      jest.spyOn(Inventory, 'findOneAndUpdate').mockResolvedValue(null);
      jest.spyOn(Inventory, 'findOne').mockResolvedValue(existingInventory);

      const payload = {
        customer: { name: 'Jane Doe', email: 'jane@example.com' },
        items: [{ productId: sampleProductId.toString(), sku: 'ROY-IMP-50', quantity: 1 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '+92 333 1112233',
          addressLine1: 'Street 1',
          city: 'Lahore',
          postalCode: '54000',
        },
        paymentMethod: 'cash_on_delivery',
      };

      const res = await request(app).post('/api/v1/orders').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient available stock');
    });
  });
});
