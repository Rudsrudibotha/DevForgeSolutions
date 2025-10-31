import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { api } from '../utils/api'

export default function SchoolDashboard() {
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [students, setStudents] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const { logout } = useAuthStore()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [stats, users, students] = await Promise.all([
        api.get('/school/dashboard'),
        api.get('/school/users'),
        api.get('/students')
      ])
      setStats(stats)
      setUsers(users)
      setStudents(students)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveUser = async (userId) => {
    try {
      await api.patch(`/school/users/${userId}/approve`, {})
      fetchData()
    } catch (error) {
      console.error('Failed to approve user:', error)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">School Management</h1>
        <button onClick={logout} className="bg-red-600 px-4 py-2 rounded">Logout</button>
      </nav>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-8 px-6">
          {['overview', 'students', 'users', 'attendance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm text-gray-400">Total Students</h3>
                <p className="text-2xl font-bold">{stats.totalStudents || 0}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm text-gray-400">Present Today</h3>
                <p className="text-2xl font-bold text-green-400">{stats.presentToday || 0}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm text-gray-400">Pending Approvals</h3>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingApprovals || 0}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-sm text-gray-400">Monthly Revenue</h3>
                <p className="text-2xl font-bold text-blue-400">R{((stats.monthlyRevenue || 0) / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Students</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Student No</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Grade</th>
                    <th className="px-4 py-3 text-left">Class</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-700">
                      <td className="px-4 py-3">{student.student_no}</td>
                      <td className="px-4 py-3">{student.first_name} {student.last_name}</td>
                      <td className="px-4 py-3">{student.grade}</td>
                      <td className="px-4 py-3">{student.class_group}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-green-600 rounded text-xs">{student.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">User Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-700">
                      <td className="px-4 py-3">{user.full_name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.role}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.status === 'approved' ? 'bg-green-600' : 'bg-yellow-600'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.status === 'pending' && (
                          <button
                            onClick={() => approveUser(user.id)}
                            className="bg-green-600 px-3 py-1 rounded text-xs"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Attendance Management</h2>
            <p className="text-gray-400">Attendance tracking features coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}