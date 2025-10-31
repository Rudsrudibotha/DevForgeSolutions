import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { api } from '../utils/api'

export default function BillingPage() {
  const [billingInfo, setBillingInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentAmount, setPaymentAmount] = useState(800)
  const [processing, setProcessing] = useState(false)
  const { logout } = useAuthStore()

  useEffect(() => {
    fetchBillingInfo()
  }, [])

  const fetchBillingInfo = async () => {
    try {
      const data = await api.get('/billing/status')
      setBillingInfo(data)
    } catch (error) {
      console.error('Failed to fetch billing info:', error)
    } finally {
      setLoading(false)
    }
  }

  const processPayment = async () => {
    setProcessing(true)
    try {
      await api.post('/billing/pay', { 
        amount: paymentAmount * 100, // Convert to cents
        method: 'card' 
      })
      
      // Refresh billing info
      await fetchBillingInfo()
      
      // Redirect to dashboard after successful payment
      setTimeout(() => {
        window.location.href = '/school'
      }, 2000)
    } catch (error) {
      console.error('Payment failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  const isSuspended = billingInfo?.status === 'suspended'
  const isPastDue = billingInfo?.status === 'past_due'

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">School Billing</h1>
        <button onClick={logout} className="bg-red-600 px-4 py-2 rounded">Logout</button>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* Status Alert */}
        {isSuspended && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Account Suspended</h2>
            <p className="text-red-200">
              Your school account has been suspended due to: {billingInfo.suspension_reason}
            </p>
            <p className="text-red-200 mt-2">
              Please make a payment below to reactivate your account immediately.
            </p>
          </div>
        )}

        {isPastDue && (
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-yellow-400 mb-2">Payment Overdue</h2>
            <p className="text-yellow-200">
              Your account is past due. Please make a payment to avoid suspension.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* School Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">School Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400">School Name:</span>
                <span className="ml-2">{billingInfo?.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Plan:</span>
                <span className="ml-2 capitalize">{billingInfo?.plan_type}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  billingInfo?.status === 'active' ? 'bg-green-600' :
                  billingInfo?.status === 'suspended' ? 'bg-red-600' :
                  billingInfo?.status === 'past_due' ? 'bg-yellow-600' : 'bg-gray-600'
                }`}>
                  {billingInfo?.status}
                </span>
              </div>
              {billingInfo?.suspended_at && (
                <div>
                  <span className="text-gray-400">Suspended:</span>
                  <span className="ml-2">{new Date(billingInfo.suspended_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Current Usage</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Students:</span>
                <span>{billingInfo?.usage?.students || 0} / {billingInfo?.max_students}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Staff:</span>
                <span>{billingInfo?.usage?.staff || 0} / {billingInfo?.max_staff}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((billingInfo?.usage?.students || 0) / billingInfo?.max_students * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {(isSuspended || isPastDue) && (
          <div className="bg-gray-800 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
            <div className="max-w-md">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Payment Amount (ZAR)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
                  min="100"
                  step="50"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Minimum payment: R100. Recommended: R800 (monthly subscription)
                </p>
              </div>

              <button
                onClick={processPayment}
                disabled={processing || paymentAmount < 100}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {processing ? 'Processing Payment...' : `Pay R${paymentAmount}`}
              </button>

              <p className="text-xs text-gray-400 mt-3">
                * This is a demo payment system. In production, this would integrate with a real payment provider.
              </p>
            </div>
          </div>
        )}

        {billingInfo?.status === 'active' && (
          <div className="bg-green-900 border border-green-700 rounded-lg p-4 mt-6">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Account Active</h3>
            <p className="text-green-200">
              Your school account is active and in good standing.
            </p>
            <a 
              href="/school" 
              className="inline-block mt-3 bg-green-600 px-4 py-2 rounded text-sm"
            >
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  )
}