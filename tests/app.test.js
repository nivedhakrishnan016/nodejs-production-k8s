'use strict';

const request = require('supertest');
const app     = require('../src/index');

describe('Node.js Production API — Test Suite', () => {

  describe('GET /', () => {
    it('should return 200 with service metadata', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body.service).toBe('nodejs-production-api');
      expect(res.body.status).toBe('running');
    });
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 with Prometheus-format metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('nodejs_app_up 1');
      expect(res.text).toContain('nodejs_app_uptime_seconds');
    });
  });

});
