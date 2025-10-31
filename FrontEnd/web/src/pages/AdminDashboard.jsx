import { useState, useEffect } from 'react'

export default function AdminDashboard() {
  const [pendingRegistrations, setPendingRegistrations] = useState([
    {
      id: 1,
      schoolName: 'Sunshine Preschool',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@sunshinepreschool.co.za',
      phone: '+27 11 123 4567',
      studentCount: '26-50',
      submittedAt: '2024-01-15T10:30:00Z',
      status: 'pending'
    },
    {
      id: 2,
      schoolName: 'Little Stars Academy',
      contactPerson: 'Michael Smith',
      email: 'michael@littlestars.co.za',
      phone: '+27 21 987 6543',
      studentCount: '51-100',
      submittedAt: '2024-01-14T14:20:00Z',
      status: 'pending'
    }
  ])

  const handleApprove = async (registrationId) => {
    try {
      // TODO: Send approval to backend API
      console.log('Approving registration:', registrationId)
      setPendingRegistrations(prev => 
        prev.map(reg => 
          reg.id === registrationId 
            ? { ...reg, status: 'approved' }
            : reg
        )
      )
      alert('Registration approved! Payment will be processed and user will receive login credentials.')
    } catch (error) {
      alert('Failed to approve registration')
    }
  }

  const handleReject = async (registrationId) => {
    const reason = prompt('Reason for rejection:')
    if (!reason) return

    try {
      // TODO: Send rejection to backend API
      console.log('Rejecting registration:', registrationId, 'Reason:', reason)
      setPendingRegistrations(prev => 
        prev.map(reg => 
          reg.id === registrationId 
            ? { ...reg, status: 'rejected', rejectionReason: reason }
            : reg
        )
      )
      alert('Registration rejected. User will be notified via email.')
    } catch (error) {
      alert('Failed to reject registration')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900 text-yellow-200 border-yellow-700'
      case 'approved': return 'bg-green-900 text-green-200 border-green-700'
      case 'rejected': return 'bg-red-900 text-red-200 border-red-700'
      default: return 'bg-gray-900 text-gray-200 border-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-blue-400">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Rudi Botha</span>
              <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400">Pending Registrations</h3>
            <p className="text-2xl font-bold text-yellow-400">
              {pendingRegistrations.filter(r => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400">Approved This Month</h3>
            <p className="text-2xl font-bold text-green-400">
              {pendingRegistrations.filter(r => r.status === 'approved').length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400">Monthly Revenue</h3>
            <p className="text-2xl font-bold text-blue-400">
              R{pendingRegistrations.filter(r => r.status === 'approved').length * 800}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400">Active Schools</h3>
            <p className="text-2xl font-bold text-purple-400">12</p>
          </div>
        </div>

        {/* Pending Registrations */}
        <div className="bg-gray-800 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold">School Registration Requests</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    School Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {pendingRegistrations.map((registration) => (
                  <tr key={registration.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {registration.schoolName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {registration.contactPerson}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">
                        <div>{registration.email}</div>
                        <div>{registration.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {registration.studentCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {formatDate(registration.submittedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(registration.status)}`}>
                        {registration.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {registration.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(registration.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(registration.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {registration.status === 'approved' && (
                        <span className="text-green-400 text-sm">✓ Approved</span>
                      )}
                      {registration.status === 'rejected' && (
                        <span className="text-red-400 text-sm">✗ Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Control Notice */}
        <div className="mt-8 bg-blue-900/50 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">Payment Processing</h3>
          <p className="text-blue-200">
            When you approve a registration, the payment will be automatically processed and the school will receive:
          </p>
          <ul className="mt-2 text-blue-200 list-disc list-inside">
            <li>Email confirmation with login credentials</li>
            <li>Access to their school dashboard</li>
            <li>Setup call scheduling link</li>
            <li>Welcome package with training materials</li>
          </ul>
        </div>
      </div>
    </div>
  )
}