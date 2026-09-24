const { z } = require('zod');

const submitReviewSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    customerName: z.string().min(2, 'Name must be at least 2 characters').max(100),
    customerEmail: z.string().email('Valid email is required').transform((val) => val.toLowerCase().trim()),
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
    title: z.string().max(150).optional(),
    comment: z.string().min(5, 'Review comment must be at least 5 characters').max(2000),
  }),
});

const moderateReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    status: z.enum(['pending', 'approved', 'rejected'], {
      errorMap: () => ({ message: "Status must be 'pending', 'approved', or 'rejected'" }),
    }),
  }),
});

const reviewParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Review ID is required'),
  }),
});

const productReviewParamsSchema = z.object({
  params: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
});

module.exports = {
  submitReviewSchema,
  moderateReviewSchema,
  reviewParamsSchema,
  productReviewParamsSchema,
};
