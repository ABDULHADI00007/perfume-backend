const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const productsService = require('./products.service');

/**
 * Public: Get products catalog with filters, search, pagination, and sorting
 */
const getProducts = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const { products, meta } = await productsService.getProducts(req.query, isAdmin);
  return ApiResponse.success(res, 200, 'Products fetched successfully', products, meta);
});

/**
 * Public: Get single active product by slug (or fallback ID)
 */
const getProductBySlug = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const product = await productsService.getProductBySlug(req.params.slug, isAdmin);
  return ApiResponse.success(res, 200, 'Product details fetched successfully', product);
});

/**
 * Public / Admin: Get product by ID
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await productsService.getProductById(req.params.id);
  return ApiResponse.success(res, 200, 'Product fetched successfully', product);
});

/**
 * Admin: Create a new product
 */
const createProduct = asyncHandler(async (req, res) => {
  const product = await productsService.createProduct(req.body);
  return ApiResponse.created(res, 'Product created successfully', product);
});

/**
 * Admin: Update an existing product
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await productsService.updateProduct(req.params.id, req.body);
  return ApiResponse.success(res, 200, 'Product updated successfully', product);
});

/**
 * Admin: Archive a product (soft-delete)
 */
const archiveProduct = asyncHandler(async (req, res) => {
  const product = await productsService.archiveProduct(req.params.id);
  return ApiResponse.success(res, 200, 'Product archived successfully', product);
});

/**
 * Admin: Restore an archived product
 */
const restoreProduct = asyncHandler(async (req, res) => {
  const product = await productsService.restoreProduct(req.params.id);
  return ApiResponse.success(res, 200, 'Product restored successfully', product);
});

module.exports = {
  getProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct,
};
