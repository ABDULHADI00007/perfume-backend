const express = require('express');
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
const apiRoutes = require('./routes');
const logger = require('./utils/logger');

const app = express();

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

// Mount Main API Routes
app.use('/api/v1', apiRoutes);

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
