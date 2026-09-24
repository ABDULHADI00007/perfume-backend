const mongoose = require('mongoose');
const seoSchema = require('../../utils/seo.schema');

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    altText: { type: String, trim: true },
    publicId: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const productVariantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true }, // e.g., '30ml', '50ml', '100ml'
    price: { type: Number, required: true, min: [0, 'Variant price must be non-negative'] },
    compareAtPrice: { type: Number, min: [0, 'Compare price must be non-negative'] },
    sku: { type: String, required: true, uppercase: true, trim: true },
    stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative'] },
    barcode: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    description: {
      type: String,
    },
    brand: {
      type: String,
      default: 'House Perfume',
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'draft',
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be non-negative'],
      index: true,
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare price must be non-negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    images: [productImageSchema],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category reference is required'],
      index: true,
    },
    collections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Collection',
        index: true,
      },
    ],
    fragrance: {
      concentration: {
        type: String,
        enum: ['Eau de Cologne', 'Eau de Toilette', 'Eau de Parfum', 'Extrait de Parfum', 'Parfum Oil'],
        default: 'Eau de Parfum',
        index: true,
      },
      longevity: { type: String, trim: true }, // e.g. '8-10 Hours'
      sillage: { type: String, trim: true },   // e.g. 'Moderate', 'Strong'
      gender: {
        type: String,
        enum: ['Men', 'Women', 'Unisex'],
        default: 'Unisex',
        index: true,
      },
      topNotes: [{ type: String, trim: true }],
      heartNotes: [{ type: String, trim: true }],
      baseNotes: [{ type: String, trim: true }],
    },
    scentFamily: [{ type: String, trim: true, index: true }], // e.g. Woody, Oriental, Floral, Fresh
    season: [{ type: String, trim: true }],                   // e.g. Spring, Summer, Autumn, Winter
    occasions: [{ type: String, trim: true }],                // e.g. Evening, Daily, Formal
    variants: [productVariantSchema],
    seo: seoSchema,
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    bestseller: {
      type: Boolean,
      default: false,
      index: true,
    },
    newArrival: {
      type: Boolean,
      default: false,
      index: true,
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ status: 1, category: 1 });
productSchema.index({ status: 1, featured: 1 });
productSchema.index({ status: 1, bestseller: 1 });
productSchema.index({ status: 1, newArrival: 1 });
productSchema.index({ status: 1, price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', brand: 'text', shortDescription: 'text' });

module.exports = mongoose.model('Product', productSchema);
