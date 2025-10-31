import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="fixed w-full bg-gray-900/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img 
                src="/assets/images/Devlogo.jpeg" 
                alt="DevForgeSolutions" 
                className="h-12 w-auto mr-3"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <div className="hidden text-2xl font-bold text-blue-400">DevForgeSolutions</div>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#features" className="text-gray-400 hover:text-blue-400 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-400 hover:text-blue-400 transition-colors">Pricing</a>
              <div className="relative group">
                <button className="text-gray-400 hover:text-blue-400 transition-colors flex items-center">
                  Sign In <span className="ml-1">▼</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link to="/login" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-t-lg">
                    <div className="font-medium">Admin Dashboard</div>
                    <div className="text-sm text-gray-500">System administration</div>
                  </Link>
                  <Link to="/login" className="block px-4 py-3 text-gray-700 hover:bg-gray-50">
                    <div className="font-medium">School Dashboard</div>
                    <div className="text-sm text-gray-500">School management</div>
                  </Link>
                  <Link to="/login" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-b-lg">
                    <div className="font-medium">Parent Portal</div>
                    <div className="text-sm text-gray-500">View child's progress</div>
                  </Link>
                </div>
              </div>
              <Link to="/get-started" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-all transform hover:scale-105">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Transform Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"> School Management</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Save 15+ hours weekly with our complete preschool management solution. 
                Automate attendance, billing, and parent communication in one powerful platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/get-started" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all transform hover:scale-105 shadow-lg">
                  Start Today - R800/month
                </Link>
                <a href="#demo" className="border-2 border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white px-8 py-4 rounded-full text-lg font-semibold transition-all">
                  Watch Demo
                </a>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Setup in 15 minutes
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  24/7 Support
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Cancel anytime
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 shadow-2xl transform rotate-3">
                <div className="bg-white rounded-2xl p-6 transform -rotate-3">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-xl">✓</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Student Check-in</div>
                        <div className="text-sm text-gray-500">Real-time attendance tracking</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xl">💳</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Automated Billing</div>
                        <div className="text-sm text-gray-500">R15,000 collected this month</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 text-xl">📱</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Parent Updates</div>
                        <div className="text-sm text-gray-500">45 parents notified instantly</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-yellow-500 mb-2">500+</div>
              <div className="text-gray-300">Schools Trust Us</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-500 mb-2">15hrs</div>
              <div className="text-gray-300">Saved Weekly</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-500 mb-2">25%</div>
              <div className="text-gray-300">Revenue Increase</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-500 mb-2">99.9%</div>
              <div className="text-gray-300">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything Your School Needs</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">Streamline operations, engage parents, and grow your enrollment with our comprehensive platform</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Student Management</h3>
              <p className="text-gray-600">Complete profiles, medical records, emergency contacts, and enrollment tracking all in one place.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Smart Attendance</h3>
              <p className="text-gray-600">Quick check-in/out with automatic parent notifications and detailed attendance reports.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Automated Billing</h3>
              <p className="text-gray-600">Recurring invoices, online payments, and automated late payment reminders.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Parent App</h3>
              <p className="text-gray-600">iOS and Android apps for real-time updates, photos, and direct messaging with staff.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Digital Forms</h3>
              <p className="text-gray-600">Electronic enrollment, contracts, and permission slips with secure digital signatures.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Smart Analytics</h3>
              <p className="text-gray-600">Attendance trends, financial reports, and enrollment analytics for better decisions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Meet Your Developer</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                I'm <span className="text-white font-semibold">Rudi Botha</span>, founder of DevForgeSolutions — a full-stack developer who turns messy, manual processes into clean, scalable software. I design and ship production systems that are fast to launch, easy to use, and affordable to run.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="text-blue-400 text-xl mr-3">🎯</span>
                  <div>
                    <div className="text-white font-medium">Business First</div>
                    <div className="text-gray-400 text-sm">Focus on outcomes—fewer admin hours, faster payments</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-400 text-xl mr-3">⚡</span>
                  <div>
                    <div className="text-white font-medium">Speed + Quality</div>
                    <div className="text-gray-400 text-sm">Weekly milestones without cutting corners</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-400 text-xl mr-3">📈</span>
                  <div>
                    <div className="text-white font-medium">Scalable & Affordable</div>
                    <div className="text-gray-400 text-sm">Start lean, grow when you're ready</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-8 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-6">My Process</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">1</div>
                  <div>
                    <div className="text-white font-medium">Map the workflow</div>
                    <div className="text-gray-400 text-sm">Plain language discussion (15-30 min)</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">2</div>
                  <div>
                    <div className="text-white font-medium">Prototype fast</div>
                    <div className="text-gray-400 text-sm">Click through and give feedback early</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">3</div>
                  <div>
                    <div className="text-white font-medium">Ship weekly</div>
                    <div className="text-gray-400 text-sm">Clear deliverables and transparent pricing</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">4</div>
                  <div>
                    <div className="text-white font-medium">Measure & iterate</div>
                    <div className="text-gray-400 text-sm">Track results and continuous improvement</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Contact */}
      <section id="pricing" className="py-20 bg-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your School?</h2>
          <p className="text-xl mb-12 opacity-90">Join hundreds of schools saving time and increasing revenue</p>
          
          <div className="bg-white text-gray-900 rounded-3xl p-8 shadow-2xl max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-4xl font-bold text-blue-600 mb-2">R800<span className="text-xl font-normal text-gray-600">/month</span></div>
              <div className="text-gray-600">Up to 250 students • All features included</div>
            </div>
            
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              const message = `Hi! I'm interested in DevForgeSolutions for my school:\n\nName: ${formData.get('name')} ${formData.get('surname')}\nSchool: ${formData.get('school')}\nStudents: ${formData.get('students')}\nNeeds: ${formData.get('needs')}`
              window.open(`https://wa.me/27731510877?text=${encodeURIComponent(message)}`, '_blank')
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="name" type="text" placeholder="First Name" required className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
                <input name="surname" type="text" placeholder="Last Name" required className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
              </div>
              <input name="school" type="text" placeholder="School Name" required className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
              <input name="students" type="number" placeholder="Number of Students" required className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
              <textarea name="needs" placeholder="Tell us about your specific needs..." rows="4" className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"></textarea>
              
              <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 rounded-xl text-lg font-semibold flex items-center justify-center transition-all transform hover:scale-105 shadow-lg">
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.595z"/>
                </svg>
                Get Started via WhatsApp
              </button>
            </form>
            
            <div className="mt-6 text-sm text-gray-500 text-center">
              Setup in 15 minutes • Full support included • Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-6">
                <img src="/assets/images/Devlogo.jpeg" alt="DevForgeSolutions" className="h-10 w-auto mr-3" />
                <span className="text-xl font-bold">DevForgeSolutions</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">Built by Rudi Botha - Full-stack developer specializing in school management solutions across South Africa.</p>
              <div className="flex space-x-4">
                <a href="mailto:rudi@devforgesolutions.com" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">📧</a>
                <a href="https://wa.me/27731510877" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-500 transition-colors">📱</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-6">Product</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-6">Support</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="https://wa.me/27731510877" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Training</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 DevForgeSolutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}