import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function GetStartedPage() {
  const [userType, setUserType] = useState('')

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="text-2xl font-bold text-blue-400">
              DevForgeSolutions
            </Link>
            <Link 
              to="/login" 
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get Started with DevForgeSolutions</h1>
          <p className="text-xl text-gray-300">Choose your path to streamline school management</p>
        </div>

        {/* User Type Selection */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div 
            className={`p-8 rounded-xl border-2 cursor-pointer transition-all ${
              userType === 'school' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setUserType('school')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">I'm a School</h3>
              <p className="text-gray-300">Set up your school's management system</p>
            </div>
          </div>

          <div 
            className={`p-8 rounded-xl border-2 cursor-pointer transition-all ${
              userType === 'parent' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setUserType('parent')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">I'm a Parent</h3>
              <p className="text-gray-300">Connect with your child's school</p>
            </div>
          </div>
        </div>

        {/* School Path */}
        {userType === 'school' && (
          <div className="bg-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-3xl font-bold mb-6 text-blue-400">School Setup Process</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Contact Us</h3>
                  <p className="text-gray-300 mb-3">Schedule a demo call to discuss your school's needs</p>
                  <a 
                    href="https://wa.me/27731510877?text=Hi%20Rudi,%20I'm%20interested%20in%20DevForgeSolutions%20for%20my%20school"
                    className="inline-flex items-center bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                    WhatsApp Demo Request
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Custom Setup</h3>
                  <p className="text-gray-300">We'll configure the system for your school's specific requirements</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Staff Training</h3>
                  <p className="text-gray-300">Comprehensive training for your administrative staff</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">4</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Go Live</h3>
                  <p className="text-gray-300">Launch your school management system with ongoing support</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gray-700 rounded-lg">
              <h4 className="text-lg font-semibold mb-2">What's Included:</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Student & staff management</li>
                <li>• Attendance tracking</li>
                <li>• Billing & invoicing</li>
                <li>• Parent communication</li>
                <li>• Mobile app for parents</li>
                <li>• 24/7 support</li>
              </ul>
              <div className="flex items-center justify-between mt-4">
                <p className="text-2xl font-bold text-blue-400">R800/month</p>
                <p className="text-gray-300">Up to 250 students</p>
              </div>
              <a 
                href="https://wa.me/27731510877?text=Hi%20Rudi,%20I%20want%20to%20start%20today%20with%20DevForgeSolutions%20for%20R800/month"
                className="block w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg font-semibold transition-colors"
              >
                Start Today - R800/month
              </a>
            </div>
          </div>
        )}

        {/* Parent Path */}
        {userType === 'parent' && (
          <div className="bg-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-3xl font-bold mb-6 text-green-400">Parent Access</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Check with Your School</h3>
                  <p className="text-gray-300">Ask your school if they use DevForgeSolutions</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Get Your Login Details</h3>
                  <p className="text-gray-300">Your school will provide your parent portal credentials</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Download the App</h3>
                  <p className="text-gray-300 mb-3">Get the mobile app for easy access on the go</p>
                  <div className="flex space-x-4">
                    <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
                      📱 iOS App (Coming Soon)
                    </button>
                    <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
                      🤖 Android App (Coming Soon)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gray-700 rounded-lg">
              <h4 className="text-lg font-semibold mb-2">As a Parent, You Can:</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• View your child's attendance</li>
                <li>• Check academic progress</li>
                <li>• Receive school notifications</li>
                <li>• Pay fees online</li>
                <li>• Communicate with teachers</li>
                <li>• Access school calendar</li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-blue-900/50 rounded-lg border border-blue-700">
              <p className="text-blue-200">
                <strong>School not using DevForgeSolutions yet?</strong> 
                <br />
                Share this page with your school administration to help them discover our solution.
              </p>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://wa.me/27731510877?text=Hi%20Rudi,%20I%20want%20to%20start%20today%20with%20DevForgeSolutions%20for%20R800/month"
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
            >
              Start Today - R800/month
            </a>
            <a 
              href="https://wa.me/27731510877?text=Hi%20Rudi,%20I'm%20interested%20in%20DevForgeSolutions"
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Contact Us on WhatsApp
            </a>
            <a 
              href="mailto:rudi@devforgesolutions.com"
              className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}