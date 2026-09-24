const { z } = require('zod');

const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    slug: z.string().optional(),
    excerpt: z.string().max(500).optional(),
    content: z.string().min(10, 'Article content must be at least 10 characters'),
    featuredImage: z
      .object({
        url: z.string().url('Invalid image URL').optional().or(z.literal('')),
        altText: z.string().optional(),
        publicId: z.string().optional(),
      })
      .optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    seo: z
      .object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        canonicalUrl: z.string().optional(),
      })
      .optional(),
  }),
});

const updatePostSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Post ID is required'),
  }),
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    slug: z.string().optional(),
    excerpt: z.string().max(500).optional(),
    content: z.string().min(10).optional(),
    featuredImage: z
      .object({
        url: z.string().url().optional().or(z.literal('')),
        altText: z.string().optional(),
        publicId: z.string().optional(),
      })
      .optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    seo: z
      .object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        canonicalUrl: z.string().optional(),
      })
      .optional(),
  }),
});

const postParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Post identifier is required'),
  }),
});

const postSlugParamsSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Post slug is required'),
  }),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  postParamsSchema,
  postSlugParamsSchema,
};
