import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../utils/api'

export default function ContractSigning() {
  const { contractId } = useParams()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [guardianInfo, setGuardianInfo] = useState({ name: '', email: '' })
  const [ectaConsent, setEctaConsent] = useState(false)

  useEffect(() => {
    fetchContract()
  }, [contractId])

  const fetchContract = async () => {
    try {
      const data = await fetch(`/api/contracts/${contractId}/sign`).then(r => r.json())
      setContract(data)
    } catch (error) {
      console.error('Failed to fetch contract:', error)
    } finally {
      setLoading(false)
    }
  }

  const signSection = async (sectionId) => {
    if (!ectaConsent) {
      alert('Please provide ECTA consent before signing')
      return
    }

    setSigning(true)
    try {
      await fetch(`/api/contracts/${contractId}/sections/${sectionId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian_name: guardianInfo.name,
          guardian_email: guardianInfo.email,
          ecta_consent: true
        })
      })
      
      fetchContract() // Refresh to show signed status
    } catch (error) {
      console.error('Failed to sign section:', error)
    } finally {
      setSigning(false)
    }
  }

  if (loading) return <div className="p-8">Loading contract...</div>

  if (!contract) return <div className="p-8">Contract not found</div>

  const allMandatorySigned = contract.sections
    ?.filter(s => s.is_mandatory)
    ?.every(s => s.signed)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Contract Signing</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">School:</span>
              <span className="ml-2">{contract.school_name}</span>
            </div>
            <div>
              <span className="text-gray-400">Student:</span>
              <span className="ml-2">{contract.first_name} {contract.last_name}</span>
            </div>
          </div>
        </div>

        {/* ECTA Consent */}
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">Electronic Signature Consent (ECTA Compliance)</h3>
          <p className="text-sm text-blue-200 mb-3">
            By proceeding with electronic signature, you acknowledge and agree that:
          </p>
          <ul className="text-sm text-blue-200 space-y-1 mb-4">
            <li>• Your electronic signature will have the same legal effect as a handwritten signature</li>
            <li>• You consent to conduct this transaction electronically</li>
            <li>• You have the necessary technology to access and retain this document</li>
            <li>• You have read and understood all contract sections before signing</li>
          </ul>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Your Full Name"
              value={guardianInfo.name}
              onChange={(e) => setGuardianInfo({...guardianInfo, name: e.target.value})}
              className="w-full p-2 bg-gray-700 rounded mb-2"
              required
            />
            <input
              type="email"
              placeholder="Your Email Address"
              value={guardianInfo.email}
              onChange={(e) => setGuardianInfo({...guardianInfo, email: e.target.value})}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={ectaConsent}
              onChange={(e) => setEctaConsent(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">I provide my consent for electronic signature as outlined above</span>
          </label>
        </div>

        {/* Contract Sections */}
        <div className="space-y-4">
          {contract.sections?.map((section, index) => (
            <div key={section.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">
                  {index + 1}. {section.title}
                  {section.is_mandatory && <span className="text-red-400 ml-2">*</span>}
                </h3>
                {section.signed ? (
                  <span className="bg-green-600 px-3 py-1 rounded text-sm">✓ Signed</span>
                ) : (
                  <span className="bg-yellow-600 px-3 py-1 rounded text-sm">Pending</span>
                )}
              </div>
              
              <div className="prose prose-invert max-w-none mb-4">
                <div dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br>') }} />
              </div>
              
              {!section.signed && (
                <button
                  onClick={() => signSection(section.id)}
                  disabled={signing || !ectaConsent || !guardianInfo.name || !guardianInfo.email}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
                >
                  {signing ? 'Signing...' : 'Sign This Section'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Completion Status */}
        {allMandatorySigned && (
          <div className="bg-green-900 border border-green-700 rounded-lg p-4 mt-6">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Contract Complete!</h3>
            <p className="text-green-200">
              All mandatory sections have been signed. The final contract document has been generated 
              and will be emailed to you shortly.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-400 mt-6 p-4 bg-gray-800 rounded">
          <p>
            This electronic signature process is compliant with the Electronic Communications and 
            Transactions Act (ECTA). Your signature, IP address, and timestamp are recorded for 
            legal verification purposes.
          </p>
        </div>
      </div>
    </div>
  )
}