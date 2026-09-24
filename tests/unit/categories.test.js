const categoriesService = require('../../src/modules/categories/categories.service');
const Category = require('../../src/modules/categories/categories.model');
const ApiError = require('../../src/utils/apiError');

describe('Categories Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCategory', () => {
    test('creates category with auto-generated slug', async () => {
      jest.spyOn(Category, 'findOne').mockResolvedValue(null);
      jest.spyOn(Category, 'create').mockImplementation((data) =>
        Promise.resolve({ _id: 'cat1', ...data })
      );

      const result = await categoriesService.createCategory({
        name: 'Woody Scents',
        description: 'Warm cedar and oud',
      });

      expect(result.slug).toBe('woody-scents');
      expect(result.name).toBe('Woody Scents');
    });

    test('throws conflict error on duplicate category slug', async () => {
      jest.spyOn(Category, 'findOne').mockResolvedValue({ _id: 'cat1', slug: 'woody' });

      await expect(
        categoriesService.createCategory({ name: 'Woody', slug: 'woody' })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('getCategories', () => {
    test('returns only active categories for public queries', async () => {
      const mockCategories = [{ _id: 'cat1', name: 'Woody', status: 'active' }];
      const findSpy = jest.spyOn(Category, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockCategories),
        }),
      });

      const result = await categoriesService.getCategories({}, true);
      expect(findSpy).toHaveBeenCalledWith({ status: 'active' });
      expect(result.categories).toHaveLength(1);
    });
  });

  describe('archiveCategory', () => {
    test('archives category by setting status to inactive', async () => {
      const mockCategory = {
        _id: 'cat1',
        name: 'Floral',
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Category, 'findById').mockResolvedValue(mockCategory);

      const result = await categoriesService.archiveCategory('cat1');
      expect(result.status).toBe('inactive');
      expect(mockCategory.save).toHaveBeenCalled();
    });
  });
});
