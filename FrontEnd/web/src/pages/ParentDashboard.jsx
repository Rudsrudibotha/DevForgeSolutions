import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { api } from '../utils/api'

export default function ParentDashboard() {
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [invoices, setInvoices] = useState([])
  const [activeTab, setActiveTab] = useState('children')
  const [loading, setLoading] = useState(true)
  const { logout } = useAuthStore()

  useEffect(() => {
    fetchChildren()
    fetchInvoices()
  }, [])

  useEffect(() => {
    if (selectedChild) {
      fetchAttendance(selectedChild.id)
    }
  }, [selectedChild])

  const fetchChildren = async () => {
    try {
      const data = await api.get('/parent/children')
      setChildren(data)
      if (data.length > 0) setSelectedChild(data[0])
    } catch (error) {
      console.error('Failed to fetch children:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendance = async (childId) => {
    try {
      const data = await api.get(`/parent/children/${childId}/attendance`)
      setAttendance(data)
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    }
  }

  const fetchInvoices = async () => {
    try {
      const data = await api.get('/parent/invoices')
      setInvoices(data)
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Parent Portal</h1>
        <button onClick={logout} className="bg-red-600 px-4 py-2 rounded">Logout</button>
      </nav>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-8 px-6">
          {['children', 'attendance', 'invoices', 'messages'].map((tab) => (
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
        {activeTab === 'children' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">My Children</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children.map((child) => (
                <div key={child.id} className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold">{child.first_name} {child.last_name}</h3>
                  <p className="text-gray-400">Student No: {child.student_no}</p>
                  <p className="text-gray-400">Grade: {child.grade}</p>
                  <p className="text-gray-400">Class: {child.class_group}</p>
                  <button
                    onClick={() => {
                      setSelectedChild(child)
                      setActiveTab('attendance')
                    }}
                    className="mt-4 bg-blue-600 px-4 py-2 rounded text-sm"
                  >
                    View Attendance
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Attendance Record</h2>
              {children.length > 1 && (
                <select
                  value={selectedChild?.id || ''}
                  onChange={(e) => {
                    const child = children.find(c => c.id === e.target.value)
                    setSelectedChild(child)
                  }}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-2"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedChild && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-semibold">{selectedChild.first_name} {selectedChild.last_name}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Check In</th>
                        <th className="px-4 py-3 text-left">Check Out</th>
                        <th className="px-4 py-3 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record, index) => (
                        <tr key={index} className="border-b border-gray-700">
                          <td className="px-4 py-3">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            {record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-4 py-3">{record.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Invoices & Payments</h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice Date</th>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Due Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-700">
                        <td className="px-4 py-3">{new Date(invoice.issue_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{invoice.first_name} {invoice.last_name}</td>
                        <td className="px-4 py-3">R{(invoice.balance_cents / 100).toFixed(2)}</td>
                        <td className="px-4 py-3">{new Date(invoice.due_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            invoice.status === 'paid' ? 'bg-green-600' :
                            invoice.status === 'overdue' ? 'bg-red-600' : 'bg-yellow-600'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Messages</h2>
            <p className="text-gray-400">No new messages</p>
          </div>
        )}
      </div>
    </div>
  )
}