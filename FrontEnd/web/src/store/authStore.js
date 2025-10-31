import { create } from 'zustand'

// Secure token storage using httpOnly cookies (handled by server)
const getStoredAuth = () => {
  try {
    const stored = sessionStorage.getItem('auth_state');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const setStoredAuth = (authState) => {
  try {
    if (authState) {
      sessionStorage.setItem('auth_state', JSON.stringify(authState));
    } else {
      sessionStorage.removeItem('auth_state');
    }
  } catch (error) {
    // Silently handle storage errors
  }
};

export const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  user: null,
  schoolId: null,
  
  login: async (email, password) => {
    try {
      if (!email?.trim() || !password?.trim()) {
        return { success: false, error: 'Email and password are required' };
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': crypto.randomUUID()
        },
        credentials: 'include', // Include httpOnly cookies
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        return { success: false, error: errorData.error || 'Login failed' };
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }
      
      const authState = {
        isAuthenticated: true,
        user: data.user,
        schoolId: data.user?.school_id || null
      };
      
      set(authState);
      setStoredAuth({ user: data.user, schoolId: data.user?.school_id });
      
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: 'Network error occurred' };
    }
  },
  
  logout: async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      }).catch(() => {});
    } finally {
      setStoredAuth(null);
      set({
        isAuthenticated: false,
        user: null,
        schoolId: null
      });
    }
  },
  
  // Initialize auth state from secure storage
  initAuth: async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.user) {
          const authState = {
            isAuthenticated: true,
            user: data.user,
            schoolId: data.user.school_id
          };
          set(authState);
          setStoredAuth({ user: data.user, schoolId: data.user.school_id });
          return;
        }
      }
    } catch {
      // Fallback to stored state for offline scenarios
      const stored = getStoredAuth();
      if (stored?.user) {
        set({
          isAuthenticated: true,
          user: stored.user,
          schoolId: stored.schoolId
        });
      }
    }
  }
}))