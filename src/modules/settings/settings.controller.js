const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const settingsService = require('./settings.service');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  return ApiResponse.success(res, 200, 'Store settings fetched successfully', settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  return ApiResponse.success(res, 200, 'Store settings updated successfully', settings);
});

module.exports = {
  getSettings,
  updateSettings,
};
