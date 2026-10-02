const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

/**
 * Connect to MongoDB Atlas / Local Instance with Auto-Retry
 */
const connectDB = async (retries = 5, delayMs = 3000) => {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return mongoose.connection;
  }

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/perfume_db';

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('✅ MongoDB Connection established successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('❌ MongoDB Connection Error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('⚠️ MongoDB Connection lost');
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Connecting to MongoDB... (Attempt ${attempt}/${retries})`);
      const conn = await mongoose.connect(dbUri, {
        autoIndex: process.env.NODE_ENV !== 'production',
        serverSelectionTimeoutMS: 5000,
      });

      isConnected = true;
      return conn;
    } catch (error) {
      logger.error(`❌ MongoDB Connection Attempt ${attempt} Failed: ${error.message}`);
      if (attempt < retries) {
        logger.info(`Waiting ${(delayMs / 1000).toFixed(1)}s before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw new Error(`Failed to connect to MongoDB after ${retries} attempts: ${error.message}`);
      }
    }
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

