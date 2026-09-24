const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createInventorySchema = z.object({
  body: z.object({
    product: z.string().regex(objectIdRegex, 'Invalid product ID format'),
    variantSku: z.string().min(1, 'Variant SKU is required'),
    size: z.string().optional(),
    quantity: z.number().int().min(0, 'Quantity cannot be negative'),
    lowStockThreshold: z.number().int().min(0).optional().default(5),
  }),
});

const updateQuantitySchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid inventory ID format'),
  }),
  body: z.object({
    quantity: z.number().int().min(0, 'Quantity must be non-negative'),
    reason: z.string().optional(),
  }),
});

const adjustStockSchema = z.object({
  body: z.object({
    variantSku: z.string().min(1, 'Variant SKU is required'),
    productId: z.string().regex(objectIdRegex, 'Invalid product ID format').optional(),
    adjustment: z.number().int().refine((val) => val !== 0, 'Adjustment must not be 0'),
    reason: z.string().min(2, 'Adjustment reason is required'),
  }),
});

const reserveStockSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        variantSku: z.string().min(1),
        productId: z.string().regex(objectIdRegex).optional(),
        quantity: z.number().int().min(1, 'Reservation quantity must be at least 1'),
      })
    ).min(1, 'At least one item required for reservation'),
    orderNumber: z.string().optional(),
  }),
});

const releaseStockSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        variantSku: z.string().min(1),
        productId: z.string().regex(objectIdRegex).optional(),
        quantity: z.number().int().min(1, 'Release quantity must be at least 1'),
      })
    ).min(1, 'At least one item required to release'),
    orderNumber: z.string().optional(),
    reason: z.string().optional(),
  }),
});

const queryInventorySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
    search: z.string().optional(),
    lowStock: z.enum(['true', 'false']).optional(),
  }),
});

module.exports = {
  createInventorySchema,
  updateQuantitySchema,
  adjustStockSchema,
  reserveStockSchema,
  releaseStockSchema,
  queryInventorySchema,
};
