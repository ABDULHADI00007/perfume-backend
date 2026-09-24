const mongoose = require('mongoose');
const seoSchema = require('../../utils/seo.schema');

const settingsSchema = new mongoose.Schema(
  {
    store: {
      name: { type: String, default: 'Perfume Store', trim: true },
      slogan: { type: String, default: 'Luxury Fragrance House', trim: true },
      logo: { type: String },
      supportEmail: { type: String, lowercase: true, trim: true, default: 'support@perfumebrand.com' },
      supportPhone: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    currency: {
      code: { type: String, default: 'USD', uppercase: true, trim: true },
      symbol: { type: String, default: '$', trim: true },
      format: { type: String, default: '${amount}', trim: true },
    },
    shipping: {
      freeShippingThreshold: { type: Number, default: 100, min: 0 },
      flatRateFee: { type: Number, default: 10, min: 0 },
      defaultCarrier: { type: String, default: 'FedEx', trim: true },
    },
    tax: {
      enableTax: { type: Boolean, default: true },
      defaultTaxPercentage: { type: Number, default: 5, min: 0, max: 100 },
      taxIncludedInPrice: { type: Boolean, default: false },
    },
    payment: {
      cod: {
        enabled: { type: Boolean, default: true },
      },
      bankTransfer: {
        enabled: { type: Boolean, default: true },
        bankName: { type: String, default: 'Standard Chartered Bank', trim: true },
        accountTitle: { type: String, default: 'House of Perfume Ltd', trim: true },
        accountNumber: { type: String, default: '01029384756', trim: true },
        iban: { type: String, default: 'US93SCBL00000001029384756', trim: true },
        instructions: {
          type: String,
          default: 'Please transfer the exact order amount and upload your transaction receipt/screenshot.',
          trim: true,
        },
      },
    },
    socialLinks: {
      instagram: { type: String, trim: true },
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      pinterest: { type: String, trim: true },
    },
    seo: seoSchema,
    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: 'Store is temporarily down for routine maintenance.' },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
