import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { api } from '../utils/api'

export default function PlatformDashboard() {
  const [stats, setStats] = useState({})
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newSchool, setNewSchool] = useState({ name: '', slug: '', contact_email: '', plan_type: 'basic' })
  const { logout } = useAuthStore()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [stats, schools] = await Promise.all([
        api.get('/platform/stats'),
        api.get('/platform/schools')
      ])
      setStats(stats)
      setSchools(schools)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSchoolStatus = async (schoolId, status, reason = '') => {
    try {
      await api.patch(`/platform/schools/${schoolId}/status`, { status, reason })
      fetchData()
    } catch (error) {
      console.error('Failed to update school:', error)
    }
  }

  const createSchool = async (e) => {
    e.preventDefault()
    try {
      await api.post('/platform/schools', newSchool)
      setNewSchool({ name: '', slug: '', contact_email: '', plan_type: 'basic' })
      setShowCreateForm(false)
      fetchData()
    } catch (error) {
      console.error('Failed to create school:', error)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">DevForgeSolutions Platform</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 px-4 py-2 rounded"
          >
            Add School
          </button>
          <button onClick={logout} className="bg-red-600 px-4 py-2 rounded">Logout</button>
        </div>
      </nav>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Total Schools</h3>
            <p className="text-2xl font-bold">{stats.totalSchools || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Active Schools</h3>
            <p className="text-2xl font-bold text-green-400">{stats.activeSchools || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Suspended</h3>
            <p className="text-2xl font-bold text-red-400">{stats.suspendedSchools || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Total Users</h3>
            <p className="text-2xl font-bold">{stats.totalUsers || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm text-gray-400">Student Capacity</h3>
            <p className="text-2xl font-bold text-blue-400">{stats.totalCapacity || 0}</p>
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
                  <th className="px-4 py-3 text-left">School</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Users</th>
                  <th className="px-4 py-3 text-left">Students</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="border-b border-gray-700">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{school.name}</div>
                        <div className="text-sm text-gray-400">{school.slug}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{school.contact_email}</td>
                    <td className="px-4 py-3">{school.plan_type}</td>
                    <td className="px-4 py-3">{school.user_count}</td>
                    <td className="px-4 py-3">{school.student_count}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        school.status === 'active' ? 'bg-green-600' :
                        school.status === 'trial' ? 'bg-blue-600' :
                        school.status === 'suspended' ? 'bg-red-600' :
                        school.status === 'past_due' ? 'bg-yellow-600' : 'bg-gray-600'
                      }`}>
                        {school.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {school.status !== 'active' && school.status !== 'cancelled' && (
                          <button
                            onClick={() => handleSchoolStatus(school.id, 'active')}
                            className="bg-green-600 px-2 py-1 rounded text-xs"
                          >
                            Activate
                          </button>
                        )}
                        {school.status === 'active' && (
                          <button
                            onClick={() => {
                              const reason = prompt('Suspension reason:')
                              if (reason) handleSchoolStatus(school.id, 'suspended', reason)
                            }}
                            className="bg-red-600 px-2 py-1 rounded text-xs"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create School Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Create New School</h3>
            <form onSubmit={createSchool} className="space-y-4">
              <input
                type="text"
                placeholder="School Name"
                value={newSchool.name}
                onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded"
                required
              />
              <input
                type="text"
                placeholder="URL Slug (e.g., abc-preschool)"
                value={newSchool.slug}
                onChange={(e) => setNewSchool({...newSchool, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                className="w-full p-2 bg-gray-700 rounded"
                required
              />
              <input
                type="email"
                placeholder="Contact Email"
                value={newSchool.contact_email}
                onChange={(e) => setNewSchool({...newSchool, contact_email: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded"
                required
              />
              <select
                value={newSchool.plan_type}
                onChange={(e) => setNewSchool({...newSchool, plan_type: e.target.value})}
                className="w-full p-2 bg-gray-700 rounded"
              >
                <option value="basic">Basic (50 students)</option>
                <option value="premium">Premium (150 students)</option>
                <option value="enterprise">Enterprise (500 students)</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 px-4 py-2 rounded flex-1">
                  Create
                </button>
                <button 
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-600 px-4 py-2 rounded flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}