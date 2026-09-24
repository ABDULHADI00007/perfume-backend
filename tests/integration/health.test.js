const request = require('supertest');
const app = require('../../src/app');

describe('API Integration Health Check', () => {
  test('GET /api/v1/health should return 200 OK', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('healthy');
  });

  test('GET /api/docs should serve Swagger UI HTML', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('swagger');
  });
});
