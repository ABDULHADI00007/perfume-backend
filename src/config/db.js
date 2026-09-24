const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

/**
 * Connect to MongoDB Atlas / Instance
 */
const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return mongoose.connection;
  }

  const dbUri = process.env.MONGODB_URI;

  if (!dbUri) {
    logger.error('❌ MONGODB_URI is missing from environment variables');
    throw new Error('MONGODB_URI environment variable is required');
  }

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('✅ MongoDB Connection established successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB Connection Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('⚠️ MongoDB Connection lost');
    });

    const conn = await mongoose.connect(dbUri, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    return conn;
  } catch (error) {
    logger.error(`❌ Initial MongoDB Connection Failed: ${error.message}`);
    throw error;
  }
};

/**
 * Disconnect MongoDB Connection Gracefully
 */
const disconnectDB = async () => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB connection closed cleanly');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
