const collectionsService = require('../../src/modules/collections/collections.service');
const Collection = require('../../src/modules/collections/collections.model');
const ApiError = require('../../src/utils/apiError');

describe('Collections Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCollection', () => {
    test('creates collection with valid slug and products list', async () => {
      jest.spyOn(Collection, 'findOne').mockResolvedValue(null);
      jest.spyOn(Collection, 'create').mockImplementation((data) =>
        Promise.resolve({ _id: 'col1', ...data })
      );

      const result = await collectionsService.createCollection({
        name: 'Private Reserve',
        description: 'Exclusive extracts',
      });

      expect(result.slug).toBe('private-reserve');
      expect(result.name).toBe('Private Reserve');
    });

    test('throws conflict error if collection slug exists', async () => {
      jest.spyOn(Collection, 'findOne').mockResolvedValue({ _id: 'col1', slug: 'private-reserve' });

      await expect(
        collectionsService.createCollection({ name: 'Private Reserve' })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('getCollections', () => {
    test('retrieves active collections with populated products', async () => {
      const mockCollections = [{ _id: 'col1', name: 'Summer Scents', status: 'active', products: [] }];
      jest.spyOn(Collection, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockCollections),
          }),
        }),
      });

      const result = await collectionsService.getCollections({}, true);
      expect(result.collections).toHaveLength(1);
      expect(result.collections[0].name).toBe('Summer Scents');
    });
  });
});
