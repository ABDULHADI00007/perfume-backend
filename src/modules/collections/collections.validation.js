const { z } = require('zod');

const createCollectionSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Collection name must be at least 2 characters').max(100),
    slug: z.string().optional(),
    description: z.string().optional(),
    image: z
      .object({
        url: z.string().url('Invalid image URL').optional().or(z.literal('')),
        altText: z.string().optional(),
        publicId: z.string().optional(),
      })
      .optional(),
    products: z.array(z.string()).optional(),
    sortOrder: z.number().int().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    seo: z
      .object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        canonicalUrl: z.string().optional(),
      })
      .optional(),
  }),
});

const updateCollectionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Collection ID or slug is required'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    image: z
      .object({
        url: z.string().url('Invalid image URL').optional().or(z.literal('')),
        altText: z.string().optional(),
        publicId: z.string().optional(),
      })
      .optional(),
    products: z.array(z.string()).optional(),
    sortOrder: z.number().int().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    seo: z
      .object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        canonicalUrl: z.string().optional(),
      })
      .optional(),
  }),
});

const collectionParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Collection identifier is required'),
  }),
});

module.exports = {
  createCollectionSchema,
  updateCollectionSchema,
  collectionParamsSchema,
};
