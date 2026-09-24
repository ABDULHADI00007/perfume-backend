const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const customersService = require('./customers.service');

const getCustomers = asyncHandler(async (req, res) => {
  const result = await customersService.getCustomers(req.query);
  return ApiResponse.success(res, 200, 'Customers fetched successfully', result.customers, result.meta);
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customersService.getCustomerById(req.params.id);
  return ApiResponse.success(res, 200, 'Customer fetched successfully', customer);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customersService.updateCustomer(req.params.id, req.body);
  return ApiResponse.success(res, 200, 'Customer updated successfully', customer);
});

const updateCustomerStatus = asyncHandler(async (req, res) => {
  const customer = await customersService.updateCustomerStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, 200, `Customer status updated to '${req.body.status}'`, customer);
});

module.exports = {
  getCustomers,
  getCustomerById,
  updateCustomer,
  updateCustomerStatus,
};
