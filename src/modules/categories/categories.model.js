const mongoose = require('mongoose');
const seoSchema = require('../../utils/seo.schema');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      url: { type: String },
      altText: { type: String, trim: true },
      publicId: { type: String },
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    seo: seoSchema,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ status: 1, slug: 1 });
categorySchema.index({ status: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);
