const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const newsletterService = require('./newsletter.service');

const subscribe = asyncHandler(async (req, res) => {
  const { email, source } = req.body;
  const result = await newsletterService.subscribe(email, source);
  return ApiResponse.success(res, 200, result.message, result.subscriber);
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await newsletterService.unsubscribe(email);
  return ApiResponse.success(res, 200, result.message);
});

const getSubscribers = asyncHandler(async (req, res) => {
  const result = await newsletterService.getSubscribers(req.query);
  return ApiResponse.success(res, 200, 'Subscribers fetched successfully', result.subscribers, result.meta);
});

const updateSubscriberStatus = asyncHandler(async (req, res) => {
  const subscriber = await newsletterService.updateSubscriberStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, 200, `Subscriber status updated to '${req.body.status}'`, subscriber);
});

const deleteSubscriber = asyncHandler(async (req, res) => {
  await newsletterService.deleteSubscriber(req.params.id);
  return ApiResponse.success(res, 200, 'Subscriber deleted successfully');
});

module.exports = {
  subscribe,
  unsubscribe,
  getSubscribers,
  updateSubscriberStatus,
  deleteSubscriber,
};
