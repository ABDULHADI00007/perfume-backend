const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const productImageSchema = z.object({
  url: z.string().url('Image URL must be a valid URL'),
  altText: z.string().trim().optional(),
  publicId: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
});

const productVariantSchema = z.object({
  size: z.string().min(1, 'Variant size is required'),
  price: z.number().min(0, 'Variant price must be non-negative'),
  compareAtPrice: z.number().min(0, 'Compare price must be non-negative').optional(),
  sku: z.string().min(1, 'Variant SKU is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative').optional().default(0),
  barcode: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

const fragranceSchema = z.object({
  concentration: z
    .enum(['Eau de Cologne', 'Eau de Toilette', 'Eau de Parfum', 'Extrait de Parfum', 'Parfum Oil'])
    .optional()
    .default('Eau de Parfum'),
  longevity: z.string().optional(),
  sillage: z.string().optional(),
  gender: z.enum(['Men', 'Women', 'Unisex']).optional().default('Unisex'),
  topNotes: z.array(z.string()).optional().default([]),
  heartNotes: z.array(z.string()).optional().default([]),
  baseNotes: z.array(z.string()).optional().default([]),
});

const seoValidationSchema = z.object({
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  keywords: z.array(z.string()).optional().default([]),
  canonicalUrl: z.string().url().optional(),
});

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
    slug: z.string().min(2).max(200).optional(),
    shortDescription: z.string().max(500).optional(),
    description: z.string().optional(),
    brand: z.string().optional().default('House Perfume'),
    sku: z.string().min(2, 'Product SKU is required'),
    barcode: z.string().optional(),
    status: z.enum(['active', 'draft', 'archived']).optional().default('draft'),
    price: z.number().min(0, 'Price must be non-negative'),
    compareAtPrice: z.number().min(0).optional(),
    currency: z.string().optional().default('USD'),
    images: z.array(productImageSchema).optional().default([]),
    category: z.string().regex(objectIdRegex, 'Invalid category ID format'),
    collections: z.array(z.string().regex(objectIdRegex, 'Invalid collection ID format')).optional().default([]),
    fragrance: fragranceSchema.optional().default({}),
    scentFamily: z.array(z.string()).optional().default([]),
    season: z.array(z.string()).optional().default([]),
    occasions: z.array(z.string()).optional().default([]),
    variants: z.array(productVariantSchema).optional().default([]),
    seo: seoValidationSchema.optional(),
    featured: z.boolean().optional().default(false),
    bestseller: z.boolean().optional().default(false),
    newArrival: z.boolean().optional().default(false),
  }),
});

const updateProductSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid product ID format'),
  }),
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    slug: z.string().min(2).max(200).optional(),
    shortDescription: z.string().max(500).optional(),
    description: z.string().optional(),
    brand: z.string().optional(),
    sku: z.string().min(2).optional(),
    barcode: z.string().optional(),
    status: z.enum(['active', 'draft', 'archived']).optional(),
    price: z.number().min(0).optional(),
    compareAtPrice: z.number().min(0).optional(),
    currency: z.string().optional(),
    images: z.array(productImageSchema).optional(),
    category: z.string().regex(objectIdRegex, 'Invalid category ID format').optional(),
    collections: z.array(z.string().regex(objectIdRegex, 'Invalid collection ID format')).optional(),
    fragrance: fragranceSchema.partial().optional(),
    scentFamily: z.array(z.string()).optional(),
    season: z.array(z.string()).optional(),
    occasions: z.array(z.string()).optional(),
    variants: z.array(productVariantSchema).optional(),
    seo: seoValidationSchema.partial().optional(),
    featured: z.boolean().optional(),
    bestseller: z.boolean().optional(),
    newArrival: z.boolean().optional(),
  }),
});

const queryProductsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sort: z.string().optional(),
    category: z.string().optional(),
    collection: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    gender: z.enum(['Men', 'Women', 'Unisex']).optional(),
    scentFamily: z.string().optional(),
    concentration: z.string().optional(),
    featured: z.enum(['true', 'false']).optional(),
    bestseller: z.enum(['true', 'false']).optional(),
    newArrival: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    q: z.string().optional(),
    status: z.enum(['active', 'draft', 'archived']).optional(),
  }),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  queryProductsSchema,
};
