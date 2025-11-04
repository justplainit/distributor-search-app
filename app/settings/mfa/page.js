'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function MFASetupPage() {
  const [mfaSecret, setMfaSecret] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    loadMFASettings()
  }, [router])

  const loadMFASettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      
      const response = await fetch(`${apiUrl}/api/auth/mfa/setup`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setMfaSecret(data.secret)
        setQrCode(data.qrCode)
        setMfaEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Failed to load MFA settings:', error)
    }
  }

  const handleVerifyAndEnable = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      
      const response = await fetch(`${apiUrl}/api/auth/mfa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationCode }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('MFA enabled successfully!')
        setMfaEnabled(true)
        setVerificationCode('')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (error) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDisableMFA = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return
    }

    setLoading(true)
    // TODO: Implement disable MFA endpoint
    setError('Disable MFA not yet implemented')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Two-Factor Authentication (MFA)</h1>

          {mfaEnabled ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                <p className="font-medium">MFA is enabled</p>
                <p className="text-sm mt-1">Your account is protected with two-factor authentication.</p>
              </div>
              
              <button
                onClick={handleDisableMFA}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Disable MFA
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Step 1: Scan QR Code</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Use an authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator) to scan this QR code:
                </p>
                
                {qrCode && (
                  <div className="flex justify-center mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={qrCode} 
                      alt="MFA QR Code" 
                      className="border border-gray-300 rounded" 
                    />
                  </div>
                )}

                {mfaSecret && (
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Or enter this code manually:</p>
                    <code className="text-lg font-mono bg-white px-3 py-2 rounded border border-gray-300 block text-center">
                      {mfaSecret}
                    </code>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Step 2: Verify Code</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the 6-digit code from your authenticator app to enable MFA:
                </p>

                <form onSubmit={handleVerifyAndEnable}>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                      {success}
                    </div>
                  )}

                  <div className="mb-4">
                    <input
                      type="text"
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="000000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Verifying...' : 'Enable MFA'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

