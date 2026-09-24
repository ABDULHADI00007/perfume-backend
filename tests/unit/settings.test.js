const settingsService = require('../../src/modules/settings/settings.service');
const Settings = require('../../src/modules/settings/settings.model');

describe('Settings Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSettings', () => {
    test('retrieves store settings and guarantees secret protection', async () => {
      const mockSettings = {
        _id: 'set1',
        store: { name: 'House Perfume', supportEmail: 'support@houseperfume.com' },
        currency: { code: 'USD', symbol: '$' },
        shipping: { freeShippingThreshold: 150, flatRateFee: 15 },
        tax: { enableTax: true, defaultTaxPercentage: 5 },
      };
      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSettings),
      });

      const result = await settingsService.getSettings();
      expect(result.store.name).toBe('House Perfume');
      expect(result.stripeSecretKey).toBeUndefined();
      expect(result.jwtSecret).toBeUndefined();
      expect(result.databaseUrl).toBeUndefined();
    });
  });

  describe('updateSettings', () => {
    test('updates store configurations safely', async () => {
      const mockSettingsDoc = {
        store: { name: 'Old Name', toObject: () => ({ name: 'Old Name' }) },
        currency: { code: 'USD', toObject: () => ({ code: 'USD' }) },
        shipping: { flatRateFee: 15, toObject: () => ({ flatRateFee: 15 }) },
        tax: { defaultTaxPercentage: 5, toObject: () => ({ defaultTaxPercentage: 5 }) },
        socialLinks: { toObject: () => ({}) },
        maintenanceMode: { toObject: () => ({ enabled: false }) },
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Settings, 'findOne').mockResolvedValue(mockSettingsDoc);
      jest.spyOn(settingsService, 'getSettings').mockResolvedValue({
        store: { name: 'House Perfume Paris' },
      });

      const result = await settingsService.updateSettings({
        store: { name: 'House Perfume Paris' },
      });

      expect(mockSettingsDoc.save).toHaveBeenCalled();
      expect(result.store.name).toBe('House Perfume Paris');
    });
  });
});
