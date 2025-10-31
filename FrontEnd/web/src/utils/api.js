import { getCSRFHeaders } from '../lib/csrf.js';

const API_BASE = '/api';

// Validate endpoint to prevent SSRF
const validateEndpoint = (endpoint) => {
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('Invalid endpoint');
  }
  // Only allow relative paths starting with /
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  // Prevent path traversal and external URLs
  if (endpoint.includes('..') || endpoint.includes('://') || endpoint.includes('\\')) {
    throw new Error('Invalid endpoint format');
  }
  return endpoint.slice(0, 200); // Limit length
};

class ApiClient {
  async request(endpoint, options = {}) {
    const validEndpoint = validateEndpoint(endpoint);
    const url = `${API_BASE}${validEndpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders(),
        ...options.headers,
      },
      credentials: 'include', // Include httpOnly cookies
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network connection failed');
      }
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'POST', 
      body: data 
    });
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: data 
    });
  }
}

export const api = new ApiClient();