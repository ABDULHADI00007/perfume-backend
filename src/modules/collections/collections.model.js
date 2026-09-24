const mongoose = require('mongoose');
const seoSchema = require('../../utils/seo.schema');

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Collection name is required'],
      trim: true,
      maxlength: [100, 'Collection name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Collection slug is required'],
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
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        index: true,
      },
    ],
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

collectionSchema.index({ status: 1, slug: 1 });
collectionSchema.index({ status: 1, sortOrder: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
