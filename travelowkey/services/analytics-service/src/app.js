// app.js - Minimal Express app setup for analytics-service

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// --- Security Hardening Enhancements (Phase 6) ---
// NOTE: mTLS is enforced at the infrastructure level (e.g., Istio in Kubernetes)

// RBAC middleware example (add after authMiddleware)
function rbac(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Example usage: protect admin routes
// app.use('/api/admin', authMiddleware, rbac(['admin']));

// Ensure input validation (e.g., Joi) is used in all route handlers to prevent XSS/SQLi
// Example:
// const Joi = require('joi');
// router.post('/resource', validate(schema), handler);
//
// function validate(schema) {
//   return (req, res, next) => {
//     const { error } = schema.validate(req.body);
//     if (error) return res.status(400).json({ error: error.details[0].message });
//     next();
//   };
// }

// Mount analytics routes
app.use('/api/v1/analytics', analyticsRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Analytics Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      analytics: '/api/v1/analytics'
    }
  });
});

// --- Observability & Monitoring Enhancements (Phase 7) ---
// Prometheus metrics
const promClient = require('prom-client');
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Jaeger tracing (example, requires jaeger-client and opentracing)
// const initTracer = require('jaeger-client').initTracer;
// const opentracing = require('opentracing');
// const tracer = initTracer({ serviceName: 'analytics-service', reporter: { logSpans: true } }, {});
// opentracing.initGlobalTracer(tracer);
// Add span creation in routes as needed

// Centralized logging: Winston logs can be shipped to ELK stack (see logger.js)
// Grafana dashboards: Use Prometheus metrics for dashboard panels

// K8s probes: /health (already present), /ready (add below)
app.get('/ready', (req, res) => {
  // Add readiness checks as needed (e.g., DB, Redis, Kafka)
  res.json({ status: 'ready', timestamp: new Date() });
});

module.exports = app;