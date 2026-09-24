const { z } = require('zod');

const updateSettingsSchema = z.object({
  body: z.object({
    store: z
      .object({
        name: z.string().min(1).max(100).optional(),
        slogan: z.string().max(200).optional(),
        logo: z.string().optional().or(z.literal('')),
        supportEmail: z.string().email().optional(),
        supportPhone: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
    currency: z
      .object({
        code: z.string().min(3).max(3).toUpperCase().optional(),
        symbol: z.string().min(1).max(5).optional(),
        format: z.string().optional(),
      })
      .optional(),
    shipping: z
      .object({
        freeShippingThreshold: z.number().nonnegative().optional(),
        flatRateFee: z.number().nonnegative().optional(),
        defaultCarrier: z.string().optional(),
      })
      .optional(),
    tax: z
      .object({
        enableTax: z.boolean().optional(),
        defaultTaxPercentage: z.number().min(0).max(100).optional(),
        taxIncludedInPrice: z.boolean().optional(),
      })
      .optional(),
    payment: z
      .object({
        cod: z
          .object({
            enabled: z.boolean().optional(),
          })
          .optional(),
        bankTransfer: z
          .object({
            enabled: z.boolean().optional(),
            bankName: z.string().optional(),
            accountTitle: z.string().optional(),
            accountNumber: z.string().optional(),
            iban: z.string().optional(),
            instructions: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    socialLinks: z
      .object({
        instagram: z.string().optional().or(z.literal('')),
        facebook: z.string().optional().or(z.literal('')),
        twitter: z.string().optional().or(z.literal('')),
        tiktok: z.string().optional().or(z.literal('')),
        pinterest: z.string().optional().or(z.literal('')),
      })
      .optional(),
    seo: z
      .object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        canonicalUrl: z.string().optional(),
      })
      .optional(),
    maintenanceMode: z
      .object({
        enabled: z.boolean().optional(),
        message: z.string().max(500).optional(),
      })
      .optional(),
  }),
});

module.exports = {
  updateSettingsSchema,
};
