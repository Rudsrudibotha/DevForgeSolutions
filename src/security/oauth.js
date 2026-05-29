const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const JWKS_CACHE_MS = 6 * 60 * 60 * 1000;
const MICROSOFT_CONSUMERS_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';
const jwksCache = new Map();

function requireJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  return process.env.JWT_SECRET;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function signValue(value) {
  return crypto
    .createHmac('sha256', requireJwtSecret())
    .update(value)
    .digest('base64url');
}

function createOAuthState(payload) {
  const body = base64UrlJson({
    ...payload,
    iat: Date.now()
  });
  const signature = signValue(body);

  return `${body}.${signature}`;
}

function readOAuthState(state) {
  const rawState = String(state || '');
  const [body, signature] = rawState.split('.');

  if (!body || !signature) {
    throw new Error('OAuth state is invalid');
  }

  const expectedSignature = signValue(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('OAuth state is invalid');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  const issuedAt = Number(payload.iat);

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > OAUTH_STATE_MAX_AGE_MS) {
    throw new Error('OAuth state has expired');
  }

  delete payload.iat;
  return payload;
}

async function postForm(url, values) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Token exchange failed');
  }

  return payload;
}

async function getJwks(jwksUri, forceRefresh = false) {
  const cached = jwksCache.get(jwksUri);

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const response = await fetch(jwksUri);

  if (!response.ok) {
    throw new Error('Could not load OAuth signing keys');
  }

  const payload = await response.json();
  const keys = Array.isArray(payload.keys) ? payload.keys : [];
  jwksCache.set(jwksUri, {
    keys,
    expiresAt: Date.now() + JWKS_CACHE_MS
  });

  return keys;
}

async function verifyIdTokenWithJwks(idToken, options) {
  const decoded = jwt.decode(idToken, { complete: true });

  if (!decoded?.header?.kid) {
    throw new Error('Provider token is missing a signing key');
  }

  let keys = await getJwks(options.jwksUri);
  let jwk = keys.find((candidate) => candidate.kid === decoded.header.kid);

  if (!jwk) {
    keys = await getJwks(options.jwksUri, true);
    jwk = keys.find((candidate) => candidate.kid === decoded.header.kid);
  }

  if (!jwk) {
    throw new Error('Provider signing key was not found');
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const claims = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: options.audience,
    issuer: options.issuer,
    clockTolerance: 60
  });

  if (options.validateIssuer && !options.validateIssuer(claims)) {
    throw new Error('Provider token issuer is invalid');
  }

  return claims;
}

function isGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function verifyMicrosoftIdToken(idToken, clientId, tenant) {
  const resolvedTenant = tenant || 'common';
  const claims = await verifyIdTokenWithJwks(idToken, {
    audience: clientId,
    jwksUri: `https://login.microsoftonline.com/${encodeURIComponent(resolvedTenant)}/discovery/v2.0/keys`,
    validateIssuer: (tokenClaims) => {
      const issuer = String(tokenClaims.iss || '');

      if (!/^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]+\/v2\.0$/i.test(issuer)) {
        return false;
      }

      if (isGuid(resolvedTenant)) {
        return String(tokenClaims.tid || '').toLowerCase() === resolvedTenant.toLowerCase();
      }

      if (resolvedTenant === 'consumers') {
        return String(tokenClaims.tid || '').toLowerCase() === MICROSOFT_CONSUMERS_TENANT_ID;
      }

      if (resolvedTenant === 'organizations') {
        return String(tokenClaims.tid || '').toLowerCase() !== MICROSOFT_CONSUMERS_TENANT_ID;
      }

      return true;
    }
  });

  return claims;
}

async function verifyGoogleIdToken(idToken, clientId) {
  return await verifyIdTokenWithJwks(idToken, {
    audience: clientId,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs'
  });
}

function getEmailClaim(claims) {
  return claims?.email || claims?.preferred_username || claims?.upn;
}

function safeJson(value) {
  return JSON.stringify(value ?? null).replace(/[<>&\u2028\u2029]/g, (char) => {
    switch (char) {
      case '<':
        return '\\u003c';
      case '>':
        return '\\u003e';
      case '&':
        return '\\u0026';
      case '\u2028':
        return '\\u2028';
      case '\u2029':
        return '\\u2029';
      default:
        return char;
    }
  });
}

function sendAuthCompletion(res, authResponse, redirectTo) {
  const nonce = crypto.randomBytes(16).toString('base64');

  res.set('Content-Security-Policy', [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join('; '));

  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Signing in...</title>
  </head>
  <body>
    <script nonce="${nonce}">
      (() => {
        const token = ${safeJson(authResponse.token)};
        const user = ${safeJson(authResponse.user)};
        localStorage.setItem('smsToken', token);
        localStorage.setItem('smsUser', JSON.stringify(user));
        localStorage.setItem('smsLastActivity', String(Date.now()));
        window.location.replace(${safeJson(redirectTo)});
      })();
    </script>
  </body>
</html>`);
}

module.exports = {
  createOAuthState,
  getEmailClaim,
  postForm,
  readOAuthState,
  sendAuthCompletion,
  verifyGoogleIdToken,
  verifyMicrosoftIdToken
};
