const mongoose = require('mongoose');
const customersService = require('../../src/modules/customers/customers.service');
const Customer = require('../../src/modules/customers/customers.model');
const Order = require('../../src/modules/orders/orders.model');

describe('Customers Unit Tests', () => {
  const mockCustomerId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCustomers', () => {
    test('lists customers with pagination and search filter', async () => {
      const mockCustomers = [{ _id: mockCustomerId, firstName: 'John', email: 'john@example.com' }];
      jest.spyOn(Customer, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockCustomers),
            }),
          }),
        }),
      });
      jest.spyOn(Customer, 'countDocuments').mockResolvedValue(1);

      const result = await customersService.getCustomers({ search: 'john' });
      expect(result.customers).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });
  });

  describe('getCustomerById', () => {
    test('returns customer profile with recent order history without duplicating order docs', async () => {
      const mockCustomer = {
        _id: mockCustomerId,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      };
      const mockOrders = [
        { orderNumber: 'ORD-101', total: 180, orderStatus: 'delivered' },
      ];

      jest.spyOn(Customer, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCustomer),
      });

      jest.spyOn(Order, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockOrders),
            }),
          }),
        }),
      });

      const result = await customersService.getCustomerById(mockCustomerId.toString());
      expect(result.email).toBe('jane@example.com');
      expect(result.recentOrders).toHaveLength(1);
      expect(result.recentOrders[0].orderNumber).toBe('ORD-101');
    });
  });

  describe('updateCustomerStatus', () => {
    test('updates customer status to blocked/inactive', async () => {
      const mockCustomer = {
        _id: mockCustomerId,
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Customer, 'findById').mockResolvedValue(mockCustomer);

      const result = await customersService.updateCustomerStatus(mockCustomerId.toString(), 'blocked');
      expect(result.status).toBe('blocked');
      expect(mockCustomer.save).toHaveBeenCalled();
    });
  });
});
