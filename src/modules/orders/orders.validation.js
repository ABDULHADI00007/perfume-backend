const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const orderItemInputSchema = z.object({
  productId: z.string().regex(objectIdRegex, 'Invalid product ID format'),
  sku: z.string().min(1, 'Product SKU is required'),
  size: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const addressInputSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(5, 'Phone number is required'),
  addressLine1: z.string().min(3, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State / Province is required'),
  postalCode: z.string().min(2, 'Postal code is required'),
  country: z.string().min(2, 'Country is required').default('US'),
});

const createOrderSchema = z.object({
  body: z.object({
    customer: z.object({
      name: z.string().min(2, 'Customer name is required'),
      email: z.string().email('Valid customer email is required'),
      phone: z.string().optional(),
    }),
    items: z.array(orderItemInputSchema).min(1, 'At least one item is required to place an order'),
    shippingAddress: addressInputSchema,
    billingAddress: addressInputSchema.optional(),
    paymentMethod: z.enum(['cash_on_delivery', 'bank_transfer', 'cod']).default('cash_on_delivery'),
    couponCode: z.string().trim().optional(),
    notes: z.string().max(500).optional(),
    idempotencyKey: z.string().trim().optional(),
  }),
});

const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.enum([
      'pending',
      'awaiting_payment_verification',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'payment_rejected',
    ]),
    notes: z.string().optional(),
  }),
});

const updateShippingInfoSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    carrier: z.string().optional(),
    trackingNumber: z.string().optional(),
    trackingUrl: z.string().url().optional(),
    estimatedDelivery: z.string().datetime().optional(),
    shippedAt: z.string().datetime().optional(),
    deliveredAt: z.string().datetime().optional(),
  }),
});

const cancelOrderSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    reason: z.string().optional(),
  }).optional(),
});

const refundOrderSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    amount: z.number().min(0).optional(),
    reason: z.string().optional(),
  }).optional(),
});

const submitPaymentProofSchema = z.object({
  params: z.object({
    orderNumberOrId: z.string().min(1, 'Order number or ID is required'),
  }),
  body: z.object({
    url: z.string().url('Proof URL must be a valid URL'),
    storageKey: z.string().optional(),
    originalName: z.string().optional(),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).optional(),
  }),
});

const rejectPaymentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Order ID is required'),
  }),
  body: z.object({
    reason: z.string().min(3, 'Rejection reason is required and must be at least 3 characters'),
  }),
});

const queryOrdersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sort: z.string().optional(),
    orderStatus: z
      .enum([
        'pending',
        'awaiting_payment_verification',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
        'payment_rejected',
      ])
      .optional(),
    paymentStatus: z
      .enum([
        'pending',
        'pending_verification',
        'paid',
        'rejected',
        'failed',
        'refunded',
        'partially_refunded',
      ])
      .optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  updateShippingInfoSchema,
  cancelOrderSchema,
  refundOrderSchema,
  submitPaymentProofSchema,
  rejectPaymentSchema,
  queryOrdersSchema,
};
