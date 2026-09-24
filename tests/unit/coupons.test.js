const couponsService = require('../../src/modules/coupons/coupons.service');
const Coupon = require('../../src/modules/coupons/coupons.model');
const Order = require('../../src/modules/orders/orders.model');
const ApiError = require('../../src/utils/apiError');

describe('Coupons Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateCoupon', () => {
    test('calculates percentage discount accurately up to max cap', async () => {
      const mockCoupon = {
        _id: 'coup1',
        code: 'PERFUME20',
        status: 'active',
        discountType: 'percentage',
        discountValue: 20, // 20% of 200 = 40
        maximumDiscountAmount: 30, // Capped at 30
        minimumOrderAmount: 50,
      };
      jest.spyOn(Coupon, 'findOne').mockResolvedValue(mockCoupon);

      const result = await couponsService.validateCoupon('perfume20', 200);
      expect(result.discountAmount).toBe(30);
      expect(result.finalSubtotal).toBe(170);
    });

    test('calculates fixed discount without exceeding subtotal', async () => {
      const mockCoupon = {
        _id: 'coup2',
        code: 'FLAT50',
        status: 'active',
        discountType: 'fixed',
        discountValue: 50,
        minimumOrderAmount: 0,
      };
      jest.spyOn(Coupon, 'findOne').mockResolvedValue(mockCoupon);

      const result = await couponsService.validateCoupon('FLAT50', 40);
      expect(result.discountAmount).toBe(40);
      expect(result.finalSubtotal).toBe(0);
    });

    test('rejects coupon when subtotal does not meet minimum order requirement', async () => {
      const mockCoupon = {
        _id: 'coup3',
        code: 'MIN100',
        status: 'active',
        discountType: 'fixed',
        discountValue: 15,
        minimumOrderAmount: 100,
      };
      jest.spyOn(Coupon, 'findOne').mockResolvedValue(mockCoupon);

      await expect(couponsService.validateCoupon('MIN100', 80)).rejects.toThrow(ApiError);
    });

    test('rejects expired coupon', async () => {
      const mockCoupon = {
        _id: 'coup4',
        code: 'EXPIRED10',
        status: 'active',
        discountType: 'percentage',
        discountValue: 10,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      jest.spyOn(Coupon, 'findOne').mockResolvedValue(mockCoupon);

      await expect(couponsService.validateCoupon('EXPIRED10', 100)).rejects.toThrow(ApiError);
    });

    test('rejects coupon when customer reaches perCustomerLimit', async () => {
      const mockCoupon = {
        _id: 'coup5',
        code: 'ONCEPERCUST',
        status: 'active',
        discountType: 'percentage',
        discountValue: 10,
        perCustomerLimit: 1,
      };
      jest.spyOn(Coupon, 'findOne').mockResolvedValue(mockCoupon);
      jest.spyOn(Order, 'countDocuments').mockResolvedValue(1);

      await expect(
        couponsService.validateCoupon('ONCEPERCUST', 100, 'customer@example.com')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('incrementUsageSafely', () => {
    test('atomically increments coupon usage count', async () => {
      jest.spyOn(Coupon, 'findOneAndUpdate').mockResolvedValue({
        _id: 'coup1',
        code: 'TEST',
        usageCount: 1,
      });

      const result = await couponsService.incrementUsageSafely('coup1');
      expect(result.usageCount).toBe(1);
    });
  });
});
