// CSRF token management for API requests
let csrfToken = null;

export function generateCSRFToken() {
  try {
    if (!csrfToken) {
      csrfToken = crypto.randomUUID();
    }
    return csrfToken;
  } catch (e) {
    return Math.random().toString(36).substring(2);
  }
}

export function getCSRFHeaders() {
  return {
    'X-CSRF-Token': generateCSRFToken()
  };
}

export function resetCSRFToken() {
  csrfToken = null;
}