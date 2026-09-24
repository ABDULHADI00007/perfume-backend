const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const blogService = require('./blog.service');

const getPublishedPosts = asyncHandler(async (req, res) => {
  const result = await blogService.getPublishedPosts(req.query);
  return ApiResponse.success(res, 200, 'Journal posts fetched successfully', result.posts, result.meta);
});

const getPublishedPostBySlug = asyncHandler(async (req, res) => {
  const post = await blogService.getPublishedPostBySlug(req.params.slug);
  return ApiResponse.success(res, 200, 'Journal post fetched successfully', post);
});

const getAdminPosts = asyncHandler(async (req, res) => {
  const result = await blogService.getAdminPosts(req.query);
  return ApiResponse.success(res, 200, 'Posts fetched successfully', result.posts, result.meta);
});

const getPostById = asyncHandler(async (req, res) => {
  const post = await blogService.getPostById(req.params.id);
  return ApiResponse.success(res, 200, 'Post fetched successfully', post);
});

const createPost = asyncHandler(async (req, res) => {
  const post = await blogService.createPost(req.body, req.user._id);
  return ApiResponse.created(res, 'Post created successfully', post);
});

const updatePost = asyncHandler(async (req, res) => {
  const post = await blogService.updatePost(req.params.id, req.body);
  return ApiResponse.success(res, 200, 'Post updated successfully', post);
});

const publishPost = asyncHandler(async (req, res) => {
  const post = await blogService.publishPost(req.params.id);
  return ApiResponse.success(res, 200, 'Post published successfully', post);
});

const unpublishPost = asyncHandler(async (req, res) => {
  const post = await blogService.unpublishPost(req.params.id);
  return ApiResponse.success(res, 200, 'Post unpublished successfully', post);
});

const archivePost = asyncHandler(async (req, res) => {
  const post = await blogService.archivePost(req.params.id);
  return ApiResponse.success(res, 200, 'Post archived successfully', post);
});

const deletePost = asyncHandler(async (req, res) => {
  await blogService.deletePost(req.params.id);
  return ApiResponse.success(res, 200, 'Post deleted successfully');
});

module.exports = {
  getPublishedPosts,
  getPublishedPostBySlug,
  getAdminPosts,
  getPostById,
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  archivePost,
  deletePost,
};
