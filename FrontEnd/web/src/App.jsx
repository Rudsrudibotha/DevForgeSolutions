import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import GetStartedPage from './pages/GetStartedPage'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  const { isAuthenticated } = useAuthStore()

  try {
    return (
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} 
          />
          <Route path="/register" element={<LoginPage />} />
          <Route path="/demo" element={<DashboardPage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    )
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }
}

export default App