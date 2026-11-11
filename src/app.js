const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const helmetMiddleware = require('./middleware/helmet.middleware');
const corsMiddleware = require('./middleware/cors.middleware');
const { globalRateLimiter } = require('./middleware/rateLimit.middleware');
const errorHandler = require('./middleware/error.middleware');
const ApiError = require('./utils/apiError');
const path = require('path');
const apiRoutes = require('./routes');
const logger = require('./utils/logger');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const seedSuperAdmin = require('./config/seedAdmin');

let adminSeedChecked = false;

const app = express();

// Trust Proxy Configuration (SEC-VULN-09)
// Explicitly configured for verified reverse proxy infrastructure (Nginx / Cloudflare / ALB)
// Never blindly set to true to prevent client header spoofing
const trustProxyConfig = env.TRUST_PROXY;
if (trustProxyConfig && trustProxyConfig !== 'false') {
  const hopCount = parseInt(trustProxyConfig, 10);
  if (!isNaN(hopCount)) {
    app.set('trust proxy', hopCount);
  } else if (trustProxyConfig === 'true') {
    app.set('trust proxy', 1);
  } else {
    app.set('trust proxy', trustProxyConfig);
  }
} else {
  app.set('trust proxy', false);
}

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Security Headers
app.use(helmetMiddleware);

// CORS Configuration
app.use(corsMiddleware);

// Request Rate Limiting
app.use(globalRateLimiter);

// Body Parsing & Cookie Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize MongoDB Injection
app.use(mongoSanitize());

// HTTP Parameter Pollution Protection
app.use(hpp());

// Response Compression
app.use(compression());

// HTTP Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// Swagger / OpenAPI Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Perfume Ecommerce REST API',
      version: '1.0.0',
      description: 'Production-ready REST API Backend for Perfume Brand Ecommerce Application',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development Server',
      },
    ],
  },
  apis: ['./src/modules/**/*.docs.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ensure Database Readiness for Serverless Environments before Main API Routes
app.use(
  '/api/v1',
  async (req, res, next) => {
    if (req.path === '/health') return next();
    try {
      if (mongoose.connection.readyState !== 1) {
        await connectDB(2, 500);
      }
      if (!adminSeedChecked && process.env.NODE_ENV !== 'test') {
        adminSeedChecked = true;
        await seedSuperAdmin().catch((err) => {
          adminSeedChecked = false;
          logger.error('Admin seed check failed:', err.message);
        });
      }
      return next();
    } catch (err) {
      logger.error('Database readiness check failed:', err.message);
      return next(
        ApiError.internal('Database connection unavailable. Verify MONGODB_URI and Atlas IP access list (0.0.0.0/0).')
      );
    }
  },
  apiRoutes
);

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Perfume Ecommerce API Foundation',
    docs: '/api/docs',
    version: 'v1',
  });
});

// Handle 404 - Not Found Routes
app.use('*', (req, res, next) => {
  next(ApiError.notFound(`Cannot find endpoint ${req.originalUrl} on this server`));
});

// Centralized Global Error Handler
app.use(errorHandler);

module.exports = app;
