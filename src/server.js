const env = require('./config/env');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const seedSuperAdmin = require('./config/seedAdmin');
const seedCatalog = require('./config/seedCatalog');
const logger = require('./utils/logger');

let server;

/**
 * Boot Server and Establish Infrastructure Connections
 */
const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Initialize Seed Admin & Catalog if needed
    await seedSuperAdmin();
    await seedCatalog();

    // 3. Start HTTP Server
    const port = env.PORT || 5000;
    server = app.listen(port, () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on http://localhost:${port}`);
      logger.info(`📚 Swagger Documentation live at http://localhost:${port}/api/docs`);
    });
  } catch (error) {
    logger.error(`❌ Startup Error: ${error.stack || error.message}`);
    process.exit(1);
  }
};

startServer();

/**
 * Handle Uncaught Exceptions
 */
process.on('uncaughtException', (err) => {
  logger.error(`❌ UNCAUGHT EXCEPTION: ${err.stack || err.message || err}`);
});

/**
 * Handle Unhandled Rejections
 */
process.on('unhandledRejection', (err) => {
  logger.error(`❌ UNHANDLED REJECTION: ${err.stack || err.message || err}`);
});

/**
 * Graceful Shutdown Signal Handlers
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
