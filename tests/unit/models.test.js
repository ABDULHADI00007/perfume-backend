const User = require('../../src/modules/users/users.model');
const Customer = require('../../src/modules/customers/customers.model');
const Product = require('../../src/modules/products/products.model');
const Category = require('../../src/modules/categories/categories.model');
const Collection = require('../../src/modules/collections/collections.model');
const Order = require('../../src/modules/orders/orders.model');
const Review = require('../../src/modules/reviews/reviews.model');
const Coupon = require('../../src/modules/coupons/coupons.model');
const Inventory = require('../../src/modules/inventory/inventory.model');
const Blog = require('../../src/modules/blog/blog.model');
const Newsletter = require('../../src/modules/newsletter/newsletter.model');
const Settings = require('../../src/modules/settings/settings.model');

describe('Database Models Compilation Suite', () => {
  test('All 12 Mongoose models should compile and export valid model instances', () => {
    expect(User.modelName).toBe('User');
    expect(Customer.modelName).toBe('Customer');
    expect(Product.modelName).toBe('Product');
    expect(Category.modelName).toBe('Category');
    expect(Collection.modelName).toBe('Collection');
    expect(Order.modelName).toBe('Order');
    expect(Review.modelName).toBe('Review');
    expect(Coupon.modelName).toBe('Coupon');
    expect(Inventory.modelName).toBe('Inventory');
    expect(Blog.modelName).toBe('Blog');
    expect(Newsletter.modelName).toBe('Newsletter');
    expect(Settings.modelName).toBe('Settings');
  });
});
