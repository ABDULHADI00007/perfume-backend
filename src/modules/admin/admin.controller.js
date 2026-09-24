const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const adminService = require('./admin.service');

const getDashboardOverview = asyncHandler(async (req, res) => {
  const data = await adminService.getDashboardOverview();
  return ApiResponse.success(res, 200, 'Admin dashboard overview fetched successfully', data);
});

module.exports = {
  getDashboardOverview,
};
