const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const categoriesService = require('./categories.service');

const getCategories = asyncHandler(async (req, res) => {
  const isPublic = !req.user;
  const result = await categoriesService.getCategories(req.query, isPublic);
  return ApiResponse.success(res, 200, 'Categories fetched successfully', result.categories, result.meta);
});

const getCategoryByIdOrSlug = asyncHandler(async (req, res) => {
  const isPublic = !req.user;
  const category = await categoriesService.getCategoryByIdOrSlug(req.params.id, isPublic);
  return ApiResponse.success(res, 200, 'Category fetched successfully', category);
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoriesService.createCategory(req.body);
  return ApiResponse.created(res, 'Category created successfully', category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoriesService.updateCategory(req.params.id, req.body);
  return ApiResponse.success(res, 200, 'Category updated successfully', category);
});

const archiveCategory = asyncHandler(async (req, res) => {
  const category = await categoriesService.archiveCategory(req.params.id);
  return ApiResponse.success(res, 200, 'Category archived successfully', category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoriesService.deleteCategory(req.params.id);
  return ApiResponse.success(res, 200, 'Category deleted successfully');
});

module.exports = {
  getCategories,
  getCategoryByIdOrSlug,
  createCategory,
  updateCategory,
  archiveCategory,
  deleteCategory,
};
