const Settings = require('./settings.model');

class SettingsService {
  /**
   * Get store settings singleton (creates default record if not yet initialized)
   * Ensures NO secret keys or environment variables are ever leaked.
   */
  async getSettings() {
    let settings = await Settings.findOne().lean();

    if (!settings) {
      const created = await Settings.create({
        store: {
          name: 'House Perfume',
          slogan: 'Luxury Fragrance House',
          supportEmail: 'support@houseperfume.com',
        },
        currency: {
          code: 'USD',
          symbol: '$',
          format: '${amount}',
        },
        shipping: {
          freeShippingThreshold: 150,
          flatRateFee: 15,
          defaultCarrier: 'FedEx',
        },
        tax: {
          enableTax: true,
          defaultTaxPercentage: 5,
          taxIncludedInPrice: false,
        },
      });
      settings = created.toObject();
    }

    // Explicit Secret Protection: Whitelist safe return keys
    const sanitizedSettings = {
      _id: settings._id,
      store: settings.store || {},
      currency: settings.currency || {},
      shipping: settings.shipping || {},
      tax: settings.tax || {},
      payment: settings.payment || {
        cod: { enabled: true },
        bankTransfer: {
          enabled: true,
          bankName: 'Standard Chartered Bank',
          accountTitle: 'House of Perfume Ltd',
          accountNumber: '01029384756',
          iban: 'US93SCBL00000001029384756',
          instructions: 'Please transfer the exact order amount and upload your transaction receipt/screenshot.',
        },
      },
      socialLinks: settings.socialLinks || {},
      seo: settings.seo || {},
      maintenanceMode: settings.maintenanceMode || {},
      updatedAt: settings.updatedAt,
    };

    return sanitizedSettings;
  }

  /**
   * Update store settings
   * @param {Object} updateData
   */
  async updateSettings(updateData) {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    if (updateData.store) {
      settings.store = { ...settings.store.toObject(), ...updateData.store };
    }
    if (updateData.currency) {
      settings.currency = { ...settings.currency.toObject(), ...updateData.currency };
    }
    if (updateData.shipping) {
      settings.shipping = { ...settings.shipping.toObject(), ...updateData.shipping };
    }
    if (updateData.tax) {
      settings.tax = { ...settings.tax.toObject(), ...updateData.tax };
    }
    if (updateData.payment) {
      const existingPayment = settings.payment ? settings.payment.toObject() : {};
      settings.payment = {
        cod: {
          ...(existingPayment.cod || {}),
          ...(updateData.payment.cod || {}),
        },
        bankTransfer: {
          ...(existingPayment.bankTransfer || {}),
          ...(updateData.payment.bankTransfer || {}),
        },
      };
    }
    if (updateData.socialLinks) {
      settings.socialLinks = { ...settings.socialLinks.toObject(), ...updateData.socialLinks };
    }
    if (updateData.seo) {
      settings.seo = { ...(settings.seo ? settings.seo.toObject() : {}), ...updateData.seo };
    }
    if (updateData.maintenanceMode) {
      settings.maintenanceMode = {
        ...settings.maintenanceMode.toObject(),
        ...updateData.maintenanceMode,
      };
    }

    await settings.save();

    return this.getSettings();
  }
}

module.exports = new SettingsService();
