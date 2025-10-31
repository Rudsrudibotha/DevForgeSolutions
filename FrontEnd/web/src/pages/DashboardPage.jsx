import { useAuthStore } from '../store/authStore'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()

  const modules = [
    { name: 'Students', icon: '👥', color: 'bg-blue-500' },
    { name: 'Attendance', icon: '✅', color: 'bg-green-500' },
    { name: 'Staff', icon: '👔', color: 'bg-purple-500' },
    { name: 'Invoices', icon: '📄', color: 'bg-yellow-500' },
    { name: 'Payments', icon: '💳', color: 'bg-indigo-500' },
    { name: 'Contracts', icon: '📝', color: 'bg-red-500' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.email}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div
              key={module.name}
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${module.color} rounded-md p-3`}>
                    <span className="text-2xl">{module.icon}</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{module.name}</h3>
                    <p className="text-sm text-gray-500">Manage {module.name.toLowerCase()}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}