import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  schoolId: null,
  
  login: async (email, password) => {
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      set({
        isAuthenticated: true,
        user: { email, role: 'school_admin' },
        schoolId: 'school-uuid'
      })
      
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Login failed' }
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