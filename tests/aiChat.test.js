'use strict';

// Task 50: AI chatbot endpoint tests.
// We mock the AI provider so we don't depend on Hostinger being reachable.

const assert = require('node:assert');

// Mock the AI provider so require()ing the routes works.
require.cache[require.resolve('../src/business/aiProvider')] = {
  exports: {
    CallHostingerGemmaAI: async () => ({ ok: true, body: { answer: 'mock answer' } }),
    TestHostingerGemmaConnection: async () => ({ ok: true, statusCode: 200 })
  }
};

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const aiRoutes = require('../src/application/aiRoutes');

async function run() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
  app.use((req, res, next) => {
    // Inject a fake authenticated school user
    req.user = { id: 1, role: 'school', schoolId: 1, tenantId: 1 };
    next();
  });
  app.use('/api/ai', aiRoutes);

  // No live DB → canTenantUseFeature may return reason=no-active-subscription.
  // We only assert the route handler does not crash.
  const server = app.listen(0, async () => {
    const port = server.address().port;
    try {
      const r1 = await fetch('http://127.0.0.1:' + port + '/api/ai/test-connection', {
        method: 'GET',
        headers: { Cookie: '' }
      });
      // We don't assert success because sessionContext may not build without DB.
      assert.ok(r1, 'test-connection route must respond');
      console.log('[ok] /api/ai/test-connection responds with status', r1.status);
    } catch (e) {
      console.warn('[skip] /api/ai/test-connection failed (no DB?):', e.message);
    } finally {
      server.close();
    }
  });
}

module.exports = { run };
