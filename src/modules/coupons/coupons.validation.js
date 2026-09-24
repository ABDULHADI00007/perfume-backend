const { z } = require('zod');

const createCouponSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(3, 'Coupon code must be at least 3 characters')
      .max(30)
      .transform((val) => val.toUpperCase().trim()),
    description: z.string().optional(),
    discountType: z.enum(['percentage', 'fixed'], {
      errorMap: () => ({ message: "Discount type must be 'percentage' or 'fixed'" }),
    }),
    discountValue: z.number().positive('Discount value must be greater than 0'),
    minimumOrderAmount: z.number().nonnegative().optional(),
    maximumDiscountAmount: z.number().nonnegative().optional(),
    usageLimit: z.number().int().positive().optional(),
    perCustomerLimit: z.number().int().positive().optional(),
    startsAt: z.string().datetime().optional().or(z.date()).optional(),
    expiresAt: z.string().datetime().or(z.date()),
    applicableProducts: z.array(z.string()).optional(),
    applicableCategories: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

const updateCouponSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Coupon ID is required'),
  }),
  body: z.object({
    code: z
      .string()
      .min(3)
      .max(30)
      .transform((val) => val.toUpperCase().trim())
      .optional(),
    description: z.string().optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    discountValue: z.number().positive().optional(),
    minimumOrderAmount: z.number().nonnegative().optional(),
    maximumDiscountAmount: z.number().nonnegative().optional(),
    usageLimit: z.number().int().positive().optional(),
    perCustomerLimit: z.number().int().positive().optional(),
    startsAt: z.string().datetime().optional().or(z.date()).optional(),
    expiresAt: z.string().datetime().optional().or(z.date()).optional(),
    applicableProducts: z.array(z.string()).optional(),
    applicableCategories: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive', 'expired']).optional(),
  }),
});

const validateCouponSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(1, 'Coupon code is required')
      .transform((val) => val.toUpperCase().trim()),
    subtotal: z.number().nonnegative('Subtotal must be non-negative'),
    customerEmail: z.string().email('Valid email is required').optional(),
  }),
});

const couponParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Coupon ID is required'),
  }),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  couponParamsSchema,
};
