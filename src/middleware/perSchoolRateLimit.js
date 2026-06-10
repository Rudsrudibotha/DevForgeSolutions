// Security middleware - per-school floating rate limiter.
// Provides DOS protection per (schoolId, tenantId) so one busy school
// cannot exhaust the shared Node event loop for everyone.
//
// Each (key) has a sliding window over the last `windowMs`. The first
// request fills the bucket; subsequent requests append timestamps. The
// bucket is trimmed in-memory on every check (no background timer).
//
// This limiter augments the global express-rate-limit at /api/* in app.js
// for sensitive SaaS endpoints (messaging, AI, bank reconciliation).
//
// Key: schoolId (or tenantId for DevForge), or IP for unauthenticated traffic.

'use strict';

const buckets = new Map();

function nowMs() { return Date.now(); }

function trimBucket(bucket, windowMs) {
  const cutoff = nowMs() - windowMs;
  // Bucket is sorted ascending; find the first index >= cutoff
  let i = 0;
  while (i < bucket.length && bucket[i] < cutoff) i += 1;
  if (i > 0) bucket.splice(0, i);
  return bucket;
}

function check(key, { windowMs, max }) {
  if (!key) return { allowed: true, remaining: max, resetMs: 0 };
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = [];
    buckets.set(key, bucket);
  }
  trimBucket(bucket, windowMs);
  if (bucket.length >= max) {
    const oldest = bucket[0];
    return { allowed: false, remaining: 0, resetMs: Math.max(0, windowMs - (nowMs() - oldest)) };
  }
  bucket.push(nowMs());
  return { allowed: true, remaining: max - bucket.length, resetMs: windowMs };
}

// Memory housekeeping: drop empty buckets every 5 minutes.
const HOUSEKEEP_MS = 5 * 60 * 1000;
setInterval(() => {
  const cutoff = nowMs() - HOUSEKEEP_MS;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.length === 0 || bucket[bucket.length - 1] < cutoff) {
      buckets.delete(key);
    }
  }
}, HOUSEKEEP_MS).unref?.();

// Standard floating-window rate limit per school.
// windowMs default 60s, max default 600 requests per minute per school.
function perSchoolRateLimit({ windowMs = 60_000, max = 600, keyFn } = {}) {
  return function (req, res, next) {
    const key = (keyFn && keyFn(req))
      || (req.sessionContext && req.sessionContext.ActiveSchoolId && `school:${req.sessionContext.ActiveSchoolId}`)
      || (req.sessionContext && req.sessionContext.ActiveTenantId && `tenant:${req.sessionContext.ActiveTenantId}`)
      || (req.user && req.user.schoolId && `school:${req.user.schoolId}`)
      || (req.user && req.user.tenantId && `tenant:${req.user.tenantId}`)
      || (req.ip && `ip:${req.ip}`);
    const r = check(key, { windowMs, max });
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(r.remaining));
    if (!r.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(r.resetMs / 1000)));
      return res.status(429).json({ error: 'rate-limit-exceeded', retryAfterMs: r.resetMs });
    }
    next();
  };
}

// Per-user, per-action limits (e.g. message sends 60/min, AI calls 30/min).
function perUserRateLimit({ windowMs = 60_000, max, action }) {
  return function (req, res, next) {
    const userId = (req.user && req.user.id) || (req.sessionContext && req.sessionContext.UserId);
    const key = userId ? `user:${userId}:${action || 'default'}` : `ip:${req.ip}:${action || 'default'}`;
    const r = check(key, { windowMs, max });
    if (!r.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(r.resetMs / 1000)));
      return res.status(429).json({ error: 'rate-limit-exceeded', action: action || 'default' });
    }
    next();
  };
}

module.exports = { perSchoolRateLimit, perUserRateLimit, _check: check, _buckets: buckets };
