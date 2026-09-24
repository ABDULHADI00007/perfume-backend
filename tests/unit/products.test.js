const mongoose = require('mongoose');
const productsService = require('../../src/modules/products/products.service');
const Product = require('../../src/modules/products/products.model');
const Category = require('../../src/modules/categories/categories.model');
const Inventory = require('../../src/modules/inventory/inventory.model');
const ApiError = require('../../src/utils/apiError');

describe('Products Business Logic & Service Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Product Creation & Constraints', () => {
    test('create product successfully with valid data', async () => {
      const mockCategory = { _id: new mongoose.Types.ObjectId(), name: 'Woody' };
      jest.spyOn(Category, 'findById').mockResolvedValue(mockCategory);
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);

      const createdDoc = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Royal Sandalwood',
        slug: 'royal-sandalwood',
        sku: 'RS-001',
        price: 180,
        category: mockCategory._id,
        variants: [{ size: '100ml', price: 180, sku: 'RS-001-100ML', stock: 20 }],
        status: 'draft',
      };
      jest.spyOn(Product, 'create').mockResolvedValue(createdDoc);
      jest.spyOn(Inventory, 'findOneAndUpdate').mockResolvedValue({});

      const result = await productsService.createProduct({
        name: 'Royal Sandalwood',
        sku: 'RS-001',
        price: 180,
        category: mockCategory._id.toString(),
        variants: [{ size: '100ml', price: 180, sku: 'RS-001-100ML', stock: 20 }],
      });

      expect(result.name).toBe('Royal Sandalwood');
      expect(result.slug).toBe('royal-sandalwood');
    });

    test('should prevent duplicate slug collision', async () => {
      jest.spyOn(Product, 'findOne').mockResolvedValue({ _id: 'existing-id', slug: 'royal-sandalwood' });

      await expect(
        productsService.createProduct({
          name: 'Royal Sandalwood',
          sku: 'RS-002',
          price: 180,
          category: new mongoose.Types.ObjectId().toString(),
        })
      ).rejects.toThrow(ApiError);
    });

    test('should prevent duplicate SKU collision', async () => {
      jest.spyOn(Product, 'findOne')
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({ _id: 'existing-id', sku: 'RS-001' }); // sku check

      await expect(
        productsService.createProduct({
          name: 'Another Sandalwood',
          sku: 'RS-001',
          price: 180,
          category: new mongoose.Types.ObjectId().toString(),
        })
      ).rejects.toThrow(ApiError);
    });

    test('should reject invalid category reference', async () => {
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Category, 'findById').mockResolvedValue(null);

      await expect(
        productsService.createProduct({
          name: 'Mystic Rose',
          sku: 'MR-001',
          price: 150,
          category: new mongoose.Types.ObjectId().toString(),
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('Product Retrieval & Public Visibility', () => {
    test('public listing queries only active products with pagination metadata', async () => {
      const mockProducts = [
        { name: 'Oud Royale', status: 'active', price: 240 },
        { name: 'Amber Silk', status: 'active', price: 190 },
      ];

      const findQueryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };

      jest.spyOn(Product, 'find').mockReturnValue(findQueryMock);
      jest.spyOn(Product, 'countDocuments').mockResolvedValue(2);

      const result = await productsService.getProducts({ page: '1', limit: '10' }, false);

      expect(Product.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
      expect(result.products.length).toBe(2);
      expect(result.meta.totalItems).toBe(2);
      expect(result.meta.currentPage).toBe(1);
    });

    test('retrieve product by slug returns active product details', async () => {
      const mockProduct = { name: 'Oud Royale', slug: 'oud-royale', status: 'active' };

      const findOneQueryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProduct),
      };

      jest.spyOn(Product, 'findOne').mockReturnValue(findOneQueryMock);

      const result = await productsService.getProductBySlug('oud-royale', false);
      expect(result.slug).toBe('oud-royale');
    });

    test('throws 404 if product slug is not found or inactive for public', async () => {
      const findOneQueryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(Product, 'findOne').mockReturnValue(findOneQueryMock);

      await expect(productsService.getProductBySlug('non-existent-perfume', false)).rejects.toThrow(
        ApiError
      );
    });
  });

  describe('Product Archiving & Restoration', () => {
    test('archiveProduct should set status to archived', async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(),
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

      const result = await productsService.archiveProduct(mockProduct._id.toString());
      expect(result.status).toBe('archived');
      expect(mockProduct.save).toHaveBeenCalled();
    });

    test('restoreProduct should set status to active', async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(),
        status: 'archived',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

      const result = await productsService.restoreProduct(mockProduct._id.toString());
      expect(result.status).toBe('active');
      expect(mockProduct.save).toHaveBeenCalled();
    });
  });
});
