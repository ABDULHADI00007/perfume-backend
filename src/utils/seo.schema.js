const mongoose = require('mongoose');

/**
 * Reusable Sub-Schema for SEO Metadata across Products, Categories, Collections, Blog, and Settings
 */
const seoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 70 },
    description: { type: String, trim: true, maxlength: 160 },
    keywords: [{ type: String, trim: true }],
    canonicalUrl: { type: String, trim: true },
    ogImage: { type: String, trim: true },
  },
  { _id: false }
);

module.exports = seoSchema;
