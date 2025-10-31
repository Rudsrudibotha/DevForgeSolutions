import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import GetStartedPage from './pages/GetStartedPage'

function App() {
  const { isAuthenticated } = useAuthStore()

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
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/dashboard" />} 
        />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/demo" element={<DashboardPage />} />
        <Route path="/get-started" element={<GetStartedPage />} />
      </Routes>
    </div>
  )
}

export default App