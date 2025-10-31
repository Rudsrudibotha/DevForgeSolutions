import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  schoolId: null,
  
  login: async (email, password) => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': crypto.randomUUID()
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store tokens
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      
      set({
        isAuthenticated: true,
        user: data.user,
        schoolId: data.user.school_id
      });
      
      return { success: true, user: data.user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      console.error('Login failed:', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      isAuthenticated: false,
      user: null,
      schoolId: null
    });
  },
  
  // Initialize auth state from localStorage
  initAuth: () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // In a real app, verify token validity
      set({ isAuthenticated: true });
    }
  }
}))