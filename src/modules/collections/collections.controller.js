const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const collectionsService = require('./collections.service');

const getCollections = asyncHandler(async (req, res) => {
  const isPublic = !req.user;
  const result = await collectionsService.getCollections(req.query, isPublic);
  return ApiResponse.success(res, 200, 'Collections fetched successfully', result.collections, result.meta);
});

const getCollectionByIdOrSlug = asyncHandler(async (req, res) => {
  const isPublic = !req.user;
  const collection = await collectionsService.getCollectionByIdOrSlug(req.params.id, isPublic);
  return ApiResponse.success(res, 200, 'Collection fetched successfully', collection);
});

const createCollection = asyncHandler(async (req, res) => {
  const collection = await collectionsService.createCollection(req.body);
  return ApiResponse.created(res, 'Collection created successfully', collection);
});

const updateCollection = asyncHandler(async (req, res) => {
  const collection = await collectionsService.updateCollection(req.params.id, req.body);
  return ApiResponse.success(res, 200, 'Collection updated successfully', collection);
});

const archiveCollection = asyncHandler(async (req, res) => {
  const collection = await collectionsService.archiveCollection(req.params.id);
  return ApiResponse.success(res, 200, 'Collection archived successfully', collection);
});

const deleteCollection = asyncHandler(async (req, res) => {
  await collectionsService.deleteCollection(req.params.id);
  return ApiResponse.success(res, 200, 'Collection deleted successfully');
});

module.exports = {
  getCollections,
  getCollectionByIdOrSlug,
  createCollection,
  updateCollection,
  archiveCollection,
  deleteCollection,
};
