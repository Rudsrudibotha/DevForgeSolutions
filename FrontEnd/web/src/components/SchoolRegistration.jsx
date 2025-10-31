import { useState } from 'react'

export default function SchoolRegistration({ onBack }) {
  const [formData, setFormData] = useState({
    schoolName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    studentCount: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }
      
      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }
      
      setLoading(true)
      // TODO: Send to backend API
      console.log('School registration:', formData)
      setStep(2) // Move to payment step
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    setError('')
    setLoading(true)
    try {
      // TODO: Integrate with payment provider
      console.log('Processing payment...')
      setStep(3) // Move to confirmation step
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (step === 3) {
    return (
      <div className="bg-gray-800 rounded-xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-400 mb-4">Registration Submitted!</h2>
          <p className="text-gray-300 mb-6">
            Your school registration and payment are pending admin approval. 
            You'll receive an email confirmation once approved.
          </p>
          <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 mb-6">
            <p className="text-yellow-200">
              <strong>Next Steps:</strong><br />
              • Admin will review your application<br />
              • Payment will be processed upon approval<br />
              • You'll receive login credentials via email<br />
              • Setup call will be scheduled
            </p>
          </div>
          <button 
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
          >
            Back to Get Started
          </button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="bg-gray-800 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-blue-400 mb-6">Payment Information</h2>
        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Subscription Summary</h3>
          <div className="flex justify-between items-center mb-2">
            <span>DevForgeSolutions - School Management</span>
            <span>R800/month</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span>Up to 250 students</span>
            <span>Included</span>
          </div>
          <hr className="border-gray-600 my-4" />
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total</span>
            <span>R800/month</span>
          </div>
        </div>
        
        <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4 mb-6">
          <p className="text-blue-200">
            <strong>Admin Approval Required:</strong><br />
            Your payment will be processed only after admin approval. 
            This ensures proper school verification and setup.
          </p>
        </div>

        <div className="flex space-x-4">
          <button 
            onClick={() => setStep(1)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg transition-colors"
          >
            Back to Details
          </button>
          <button 
            onClick={handlePayment}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-blue-400">Create School Account</h2>
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{'School Name'} *</label>
            <input
              type="text"
              required
              value={formData.schoolName}
              onChange={(e) => setFormData(prev => ({...prev, schoolName: e.target.value}))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{'Contact Person'} *</label>
            <input
              type="text"
              required
              value={formData.contactPerson}
              onChange={(e) => setFormData(prev => ({...prev, contactPerson: e.target.value}))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{'Email Address'} *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{'Phone Number'} *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{'School Address'} *</label>
          <textarea
            required
            rows="3"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{'Number of Students'} *</label>
          <select
            required
            value={formData.studentCount}
            onChange={(e) => setFormData(prev => ({...prev, studentCount: e.target.value}))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select student count</option>
            <option value="1-25">1-25 students</option>
            <option value="26-50">26-50 students</option>
            <option value="51-100">51-100 students</option>
            <option value="101-150">101-150 students</option>
            <option value="151-200">151-200 students</option>
            <option value="201-250">201-250 students</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{'Password'} *</label>
            <input
              type="password"
              required
              minLength="8"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{'Confirm Password'} *</label>
            <input
              type="password"
              required
              minLength="8"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold mb-2">What happens next?</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Your registration will be reviewed by our admin team</li>
            <li>• Payment will be processed only after approval</li>
            <li>• You'll receive login credentials via email</li>
            <li>• We'll schedule a setup and training call</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Continue to Payment'}
        </button>
      </form>
    </div>
  )
}