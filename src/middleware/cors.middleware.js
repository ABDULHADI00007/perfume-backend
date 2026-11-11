const cors = require('cors');

const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

const corsOptions = {
  origin: (origin, callback) => {
    const envOrigins = (process.env.CLIENT_URL || '')
      .split(',')
      .map(normalizeOrigin)
      .filter(Boolean);

    const allowedOrigins = new Set([
      ...envOrigins,
      'https://soulmatesecents.com',
      'https://www.soulmatesecents.com',
      'https://soulmatescents.com',
      'https://www.soulmatescents.com',
      'http://localhost:4300',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
    ]);

    const cleanOrigin = normalizeOrigin(origin);
    if (!cleanOrigin || allowedOrigins.has(cleanOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;
