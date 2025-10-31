import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { api } from '../utils/api'

export default function AdminDashboard() {
  const [stats, setStats] = useState({})
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const { logout } = useAuthStore()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [stats, schools] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/schools')
      ])
      setStats(stats)
      setSchools(schools)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSchoolStatus = async (schoolId, status) => {
    try {
      await api.patch(`/admin/schools/${schoolId}/status`, { status })
      fetchData()
    } catch (error) {
      console.error('Failed to update school:', error)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">DevForgeSolutions Admin</h1>
        <button onClick={logout} className="bg-red-600 px-4 py-2 rounded">Logout</button>
      </nav>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Total Schools</h3>
            <p className="text-2xl font-bold">{stats.totalSchools || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Active Schools</h3>
            <p className="text-2xl font-bold text-green-400">{stats.activeSchools || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Total Users</h3>
            <p className="text-2xl font-bold">{stats.totalUsers || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Pending Approvals</h3>
            <p className="text-2xl font-bold text-yellow-400">{stats.pendingApprovals || 0}</p>
          </div>
        </div>

        {/* Schools Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">School Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">School Name</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Users</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="border-b border-gray-700">
                    <td className="px-4 py-3">{school.name}</td>
                    <td className="px-4 py-3">{school.contact_email}</td>
                    <td className="px-4 py-3">
                      {school.user_count} 
                      {school.pending_users > 0 && (
                        <span className="ml-2 text-yellow-400">({school.pending_users} pending)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        school.status === 'approved' ? 'bg-green-600' :
                        school.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}>
                        {school.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {school.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSchoolStatus(school.id, 'approved')}
                            className="bg-green-600 px-3 py-1 rounded text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleSchoolStatus(school.id, 'rejected')}
                            className="bg-red-600 px-3 py-1 rounded text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}