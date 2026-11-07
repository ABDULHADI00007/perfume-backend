const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const express = require('express');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/modules/users/users.model');
const authService = require('../../src/modules/auth/auth.service');
const { ROLES } = require('../../src/utils/constants');

describe('Priority 3 Security Remediation Test Suite (SEC-VULN-07, SEC-VULN-09, SEC-VULN-11)', () => {
  const testUserId = new mongoose.Types.ObjectId().toString();
  const testUserEmail = 'security-phase3@soulmatescents.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SEC-VULN-07: JWT Invalidation, Lifecycle & Algorithm Allowlisting', () => {
    it('generates a token with tokenVersion and algorithm HS256 upon successful login', async () => {
      const mockUser = {
        _id: new mongoose.Types.ObjectId(testUserId),
        email: testUserEmail,
        role: ROLES.ADMIN,
        status: 'active',
        tokenVersion: 0,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        toPublicJSON: () => ({ id: testUserId, email: testUserEmail, role: ROLES.ADMIN }),
      };

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.loginUser({
        email: testUserEmail,
        password: 'ValidPassword123!',
      });

      expect(result.token).toBeDefined();

      // Decode token header and payload
      const decodedToken = jwt.verify(result.token, env.JWT_SECRET, { algorithms: ['HS256'] });
      expect(decodedToken.id).toBe(testUserId);
      expect(decodedToken.tokenVersion).toBe(0);

      const header = jwt.decode(result.token, { complete: true }).header;
      expect(header.alg).toBe('HS256');
    });

    it('rejects previously issued token after user password is changed (tokenVersion mismatch)', async () => {
      // 1. Initial user has tokenVersion = 0
      const initialUser = {
        _id: testUserId,
        email: testUserEmail,
        role: ROLES.ADMIN,
        status: 'active',
        tokenVersion: 0,
        passwordChangedAt: new Date(Date.now() - 5000),
      };

      // Generate token with tokenVersion: 0
      const oldToken = jwt.sign(
        { id: testUserId, role: ROLES.ADMIN, tokenVersion: 0 },
        env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      // 2. User changes password -> tokenVersion becomes 1
      const updatedUser = {
        ...initialUser,
        tokenVersion: 1,
        passwordChangedAt: new Date(),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(updatedUser);

      // Attempting to access protected route with old token must be 401 Unauthorized
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Session has been invalidated due to a security update or password change/i);
    });

    it('rejects previously issued token if issued prior to passwordChangedAt timestamp', async () => {
      const now = Math.floor(Date.now() / 1000);
      // Token issued 100 seconds ago
      const tokenIssuedEarlier = jwt.sign(
        { id: testUserId, role: ROLES.ADMIN, tokenVersion: 1, iat: now - 100 },
        env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      // Password changed 10 seconds ago
      const userWithRecentPasswordChange = {
        _id: testUserId,
        email: testUserEmail,
        role: ROLES.ADMIN,
        status: 'active',
        tokenVersion: 1,
        passwordChangedAt: new Date((now - 10) * 1000),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(userWithRecentPasswordChange);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenIssuedEarlier}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Password recently changed/i);
    });

    it('allows access with newly issued token matching current tokenVersion', async () => {
      const activeUser = {
        _id: testUserId,
        email: testUserEmail,
        name: 'Sarah Connor',
        role: ROLES.ADMIN,
        status: 'active',
        tokenVersion: 2,
        passwordChangedAt: new Date(Date.now() - 60000),
      };

      const validNewToken = jwt.sign(
        { id: testUserId, role: ROLES.ADMIN, tokenVersion: 2, iat: Math.floor(Date.now() / 1000) },
        env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      jest.spyOn(User, 'findById').mockResolvedValue(activeUser);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validNewToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUserEmail);
    });

    it('strictly rejects tokens with disallowed algorithm (e.g. "none" algorithm confusion)', async () => {
      // Craft an unverified token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ id: testUserId, role: ROLES.ADMIN, tokenVersion: 0 })
      ).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${noneToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid authentication token/i);
    });

    it('strictly rejects tokens signed with wrong secret or malformed payload', async () => {
      const forgedToken = jwt.sign(
        { id: testUserId, role: ROLES.ADMIN, tokenVersion: 0 },
        'wrong_attacker_secret_key_12345',
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid authentication token/i);
    });

    it('rejects authentication when user account has been deleted or no longer exists', async () => {
      const validToken = jwt.sign(
        { id: testUserId, role: ROLES.ADMIN, tokenVersion: 0 },
        env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      jest.spyOn(User, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/User account associated with this session no longer exists/i);
    });

    it('rejects authentication when user account is suspended or inactive', async () => {
      const validToken = jwt.sign(
        { id: testUserId, role: ROLES.ADMIN, tokenVersion: 0 },
        env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: testUserId,
        email: testUserEmail,
        role: ROLES.ADMIN,
        status: 'suspended',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Account is suspended/i);
    });
  });

  describe('SEC-VULN-09: Express Trust Proxy & Anti-Spoofing Configuration', () => {
    it('app does not set trust proxy blindly to true', () => {
      // In Express, app.get('trust proxy') returns a function or integer or false, NEVER true boolean
      const trustProxyValue = app.get('trust proxy');
      expect(trustProxyValue).not.toBe(true);
    });

    it('correctly resolves client IP when trust proxy is configured for 1 hop', async () => {
      // Create isolated test app with trust proxy set to 1 hop
      const testProxyApp = express();
      testProxyApp.set('trust proxy', 1);
      testProxyApp.get('/test-ip', (req, res) => {
        res.json({ ip: req.ip, ips: req.ips });
      });

      // Simulated proxy request: X-Forwarded-For contains spoofed IP prepended to actual client IP
      const res = await request(testProxyApp)
        .get('/test-ip')
        .set('X-Forwarded-For', '198.51.100.99, 203.0.113.195');

      // With trust proxy: 1, Express trusts 1 hop and selects the client IP immediately before the proxy
      expect(res.body.ip).toBe('203.0.113.195');
    });

    it('ignores client-sent X-Forwarded-For headers when trust proxy is disabled', async () => {
      const untrustedApp = express();
      untrustedApp.set('trust proxy', false);
      untrustedApp.get('/test-ip', (req, res) => {
        res.json({ ip: req.ip });
      });

      const res = await request(untrustedApp)
        .get('/test-ip')
        .set('X-Forwarded-For', '203.0.113.195');

      // When trust proxy is false, req.ip resolves to socket remote address (127.0.0.1 in supertest)
      expect(res.body.ip).not.toBe('203.0.113.195');
      expect(res.body.ip).toMatch(/127\.0\.0\.1|::ffff:127\.0\.0\.1|::1/);
    });
  });

  describe('SEC-VULN-11: Dependencies & Supply Chain Integrity', () => {
    it('verifies proxy-addr package is patched to 2.0.8 or higher', () => {
      const proxyAddrPkg = require('proxy-addr/package.json');
      const versionParts = proxyAddrPkg.version.split('.').map(Number);
      // Major >= 2, minor >= 0, patch >= 8
      expect(versionParts[0]).toBeGreaterThanOrEqual(2);
      expect(versionParts[2]).toBeGreaterThanOrEqual(8);
    });

    it('verifies body-parser package is patched to 1.20.9 or higher', () => {
      const bodyParserPkg = require('body-parser/package.json');
      const versionParts = bodyParserPkg.version.split('.').map(Number);
      expect(versionParts[0]).toBeGreaterThanOrEqual(1);
      expect(versionParts[1]).toBeGreaterThanOrEqual(20);
      expect(versionParts[2]).toBeGreaterThanOrEqual(9);
    });
  });
});
