const newsletterService = require('../../src/modules/newsletter/newsletter.service');
const Newsletter = require('../../src/modules/newsletter/newsletter.model');

describe('Newsletter Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('subscribe', () => {
    test('creates new subscription with normalized lowercase email', async () => {
      jest.spyOn(Newsletter, 'findOne').mockResolvedValue(null);
      jest.spyOn(Newsletter, 'create').mockImplementation((data) =>
        Promise.resolve({ _id: 'sub1', ...data })
      );

      const result = await newsletterService.subscribe('PerfumeFan@Example.Com');
      expect(result.isNew).toBe(true);
      expect(result.subscriber.email).toBe('perfumefan@example.com');
      expect(result.subscriber.status).toBe('subscribed');
    });

    test('is idempotent when email is already subscribed', async () => {
      const existingSub = {
        _id: 'sub1',
        email: 'fan@example.com',
        status: 'subscribed',
      };
      jest.spyOn(Newsletter, 'findOne').mockResolvedValue(existingSub);

      const result = await newsletterService.subscribe('fan@example.com');
      expect(result.isNew).toBe(false);
      expect(result.message).toContain('already subscribed');
    });

    test('reactivates subscription if previously unsubscribed', async () => {
      const existingSub = {
        _id: 'sub1',
        email: 'fan@example.com',
        status: 'unsubscribed',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Newsletter, 'findOne').mockResolvedValue(existingSub);

      const result = await newsletterService.subscribe('fan@example.com');
      expect(result.isNew).toBe(false);
      expect(result.subscriber.status).toBe('subscribed');
      expect(existingSub.save).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    test('marks subscriber as unsubscribed with timestamp', async () => {
      const subscriber = {
        _id: 'sub1',
        email: 'fan@example.com',
        status: 'subscribed',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Newsletter, 'findOne').mockResolvedValue(subscriber);

      const result = await newsletterService.unsubscribe('fan@example.com');
      expect(subscriber.status).toBe('unsubscribed');
      expect(subscriber.unsubscribedAt).toBeDefined();
      expect(result.message).toContain('unsubscribed');
    });
  });
});
