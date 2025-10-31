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
      
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      set({
        isAuthenticated: true,
        user: { email, role: 'school_admin' },
        schoolId: 'school-uuid'
      })
      
      return { success: true }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' }
    }
  },
  
  logout: () => {
    set({
      isAuthenticated: false,
      user: null,
      schoolId: null
    })
  }
}))