const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const usersService = require('./users.service');

/**
 * Admin: Get list of admin users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { users, meta } = await usersService.getUsers(req.query);
  return ApiResponse.success(res, 200, 'Users fetched successfully', users, meta);
});

/**
 * Admin: Get user by ID
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  return ApiResponse.success(res, 200, 'User fetched successfully', user);
});

/**
 * Superadmin / Privileged: Create new admin user
 */
const createUser = asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.body, req.user);
  return ApiResponse.created(res, 'User created successfully', user);
});

/**
 * Superadmin / Privileged: Update user details
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body, req.user);
  return ApiResponse.success(res, 200, 'User updated successfully', user);
});

/**
 * Update user password
 */
const updateUserPassword = asyncHandler(async (req, res) => {
  const user = await usersService.updateUserPassword(req.params.id, req.body, req.user);
  return ApiResponse.success(res, 200, 'Password updated successfully', user);
});

/**
 * Update user account status
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await usersService.updateUserStatus(req.params.id, req.body.status, req.user);
  return ApiResponse.success(res, 200, 'User status updated successfully', user);
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
};
