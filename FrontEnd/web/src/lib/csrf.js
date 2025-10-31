// CSRF token management for API requests
let csrfToken = null;

const generateSecureToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Secure random generation not available');
};

export function generateCSRFToken() {
  if (!csrfToken) {
    csrfToken = generateSecureToken();
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