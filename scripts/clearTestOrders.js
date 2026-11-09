require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/db');
const Order = require('../src/modules/orders/orders.model');
const Customer = require('../src/modules/customers/customers.model');

async function clearTestOrders() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    const countBefore = await Order.countDocuments();
    console.log(`Current Total Orders: ${countBefore}`);

    const result = await Order.deleteMany({});
    console.log(`Deleted ${result.deletedCount} orders.`);

    // Reset customer aggregate counters
    const customerUpdate = await Customer.updateMany({}, {
      $set: { totalOrdersCount: 0, totalSpent: 0 }
    });
    console.log(`Reset order counters for ${customerUpdate.modifiedCount} customer(s).`);

    const countAfter = await Order.countDocuments();
    console.log(`Orders remaining in database: ${countAfter}`);

    await disconnectDB();
    console.log('Database disconnected successfully. Orders reset complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing orders:', error);
    process.exit(1);
  }
}

clearTestOrders();
