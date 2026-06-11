'use strict';

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'nodejs-production-api',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Kubernetes liveness and readiness probe endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Prometheus metrics scrape endpoint
app.get('/metrics', (req, res) => {
  res.status(200).set('Content-Type', 'text/plain').send(
    '# HELP nodejs_app_up Whether the application is running\n' +
    '# TYPE nodejs_app_up gauge\n' +
    'nodejs_app_up 1\n' +
    '# HELP nodejs_app_uptime_seconds Total uptime in seconds\n' +
    '# TYPE nodejs_app_uptime_seconds counter\n' +
    `nodejs_app_uptime_seconds ${process.uptime()}\n`
  );
});

const server = app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown — important for zero-downtime Kubernetes rolling updates
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received — shutting down gracefully');
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
