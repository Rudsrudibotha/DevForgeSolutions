// CSRF token management for API requests
let csrfToken = null;

export function generateCSRFToken() {
  if (!csrfToken) {
    csrfToken = crypto.randomUUID();
  }
  return csrfToken;
}

export function getCSRFHeaders() {
  return {
    'X-CSRF-Token': generateCSRFToken()
  };
}

export function resetCSRFToken() {
  csrfToken = null;
}