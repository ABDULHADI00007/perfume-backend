# Perfume Ecommerce Backend Architecture

A production-ready, modular, and scalable REST API backend foundation built with Node.js, Express.js, and MongoDB for an exclusive luxury perfume brand.

## Purpose

This repository provides the core architectural foundation, modular directory hierarchy, security middleware pipeline, standardized error handling, and domain separation for the Perfume Ecommerce platform.

## Tech Stack

- **Runtime**: Node.js (CommonJS JavaScript)
- **Framework**: Express.js
- **Database / ODM**: MongoDB + Mongoose
- **Validation**: Zod
- **Documentation**: Swagger / OpenAPI (`swagger-ui-express`, `swagger-jsdoc`)
- **Logging**: Winston + Morgan
- **Security**: Helmet, CORS, Express-Rate-Limit, HPP, Express-Mongo-Sanitize, Cookie-Parser, JsonWebToken, BcryptJS
- **Services**: Cloudinary (Media Storage), Stripe (Payments), Nodemailer (Emails)
- **Testing**: Jest + Supertest

---

## Folder Architecture

```text
Backend/
│
├── src/
│   ├── config/              # Configuration (DB, Env validation, Storage)
│   ├── middleware/          # Security & app middlewares (Auth, CORS, Errors, Rate Limit)
│   ├── modules/             # Domain modules (Products, Orders, Users, Auth, Admin, etc.)
│   ├── routes/              # Main API router registry (/api/v1)
│   ├── services/            # Infrastructure & external service integrations (Stripe, Cloudinary, Email)
│   ├── utils/               # Helpers (ApiError, ApiResponse, AsyncHandler, Logger, Pagination)
│   ├── app.js               # Express application config & middleware pipeline
│   └── server.js            # Server entry point, DB boot, and process signal handlers
│
├── tests/                   # Automated unit & integration tests
├── uploads/                 # Local temporary file uploads directory
├── .env                     # Local environment variables
├── .env.example             # Environment variable templates
└── README.md
```

---

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your credentials:
   ```bash
   cp .env.example .env
   ```

3. **Development Command**:
   ```bash
   npm run dev
   ```

4. **Production Command**:
   ```bash
   npm run start
   ```

5. **Run Tests**:
   ```bash
   npm test
   ```

---

## Key URLs

- **API Base Prefix**: `/api/v1`
- **Health Check**: `/api/v1/health`
- **Swagger Documentation**: `http://localhost:5000/api/docs`
