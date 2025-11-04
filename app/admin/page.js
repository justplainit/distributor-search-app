'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const userObj = JSON.parse(userData)
    setUser(userObj)

    if (userObj.role !== 'admin') {
      router.push('/')
      return
    }

    loadSuppliers()
  }, [router])

  const loadSuppliers = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const response = await fetch(`${apiUrl}/api/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers || [])
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (supplierId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${apiUrl}/api/suppliers/${supplierId}/sync`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )

      if (response.ok) {
        alert('Sync started! Check back in a few minutes.')
      }
    } catch (error) {
      alert('Sync failed: ' + error.message)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Suppliers</h2>
        
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Last Sync</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="border-b">
                <td className="p-2">{supplier.name}</td>
                <td className="p-2">{supplier.type}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded ${supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {supplier.status}
                  </span>
                </td>
                <td className="p-2">
                  {supplier.last_sync_at 
                    ? new Date(supplier.last_sync_at).toLocaleString()
                    : 'Never'}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleSync(supplier.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Sync Now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

