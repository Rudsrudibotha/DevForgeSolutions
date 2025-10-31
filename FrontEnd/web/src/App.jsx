import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import GetStartedPage from './pages/GetStartedPage'
import AdminDashboard from './pages/AdminDashboard'
import SchoolDashboard from './pages/SchoolDashboard'
import ParentDashboard from './pages/ParentDashboard'
import PlatformDashboard from './pages/PlatformDashboard'
import BillingPage from './pages/BillingPage'
import ContractSigning from './pages/ContractSigning'

function App() {
  const { isAuthenticated, initAuth } = useAuthStore()
  
  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />} 
        />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/demo" element={<DashboardPage />} />
        <Route path="/get-started" element={<GetStartedPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/school" element={<SchoolDashboard />} />
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/platform" element={<PlatformDashboard />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/contracts/:contractId/sign" element={<ContractSigning />} />
      </Routes>
    </div>
  )
}

export default App