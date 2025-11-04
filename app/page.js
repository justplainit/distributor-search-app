'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import ProductTable from '@/components/ProductTable'
import Filters from '@/components/Filters'

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    query: '',
    supplier: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    stockStatus: '',
  })
  const searchTimeoutRef = useRef(null)

  const searchProducts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    
    try {
      let token = localStorage.getItem('token')
      
      // Require authentication - redirect if no token
      if (!token) {
        router.push('/login')
        return
      }
      
      const params = new URLSearchParams()
      
      if (filters.query) params.append('q', filters.query)
      if (filters.supplier) params.append('supplier', filters.supplier)
      if (filters.category) params.append('category', filters.category)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.stockStatus) params.append('stockStatus', filters.stockStatus)

      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const response = await fetch(`${apiUrl}/api/products/search?${params}&limit=200`, {
        headers,
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Search failed:', response.status, errorData)
        // Still set products if they exist in error response
        if (errorData.products) {
          setProducts(errorData.products || [])
          setTotal(errorData.total || 0)
        } else {
          setProducts([])
          setTotal(0)
        }
        return
      }

      const data = await response.json()
      console.log('Search response:', { productsCount: data.products?.length || 0, total: data.total })
      setProducts(data.products || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Search error:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      setProducts([])
      setTotal(0)
      // Show error to user
      alert(`Search error: ${error.message || 'Please check console for details'}`)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [filters])

  // Initial search on mount (only after authenticated)
  useEffect(() => {
    if (isAuthenticated && !checkingAuth) {
      searchProducts(true)
    }
  }, [isAuthenticated, checkingAuth, searchProducts])

  // Auto-search when filters change (debounced for query)
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search for query changes only
    if (filters.query) {
      searchTimeoutRef.current = setTimeout(() => {
        searchProducts(true)
      }, 300) // 300ms delay for typing
    } else {
      // Immediate search for filter changes (non-query)
      searchProducts(true)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [filters, searchProducts])

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      
      if (!token || !user) {
        router.push('/login')
        return
      }
      
      setIsAuthenticated(true)
      setCheckingAuth(false)
    }
    
    checkAuth()
  }, [router])

  // Don't render content until auth is checked
  if (checkingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    // Save filters to localStorage
    localStorage.setItem('searchFilters', JSON.stringify(filters))
  }, [filters])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔍 Distributor Search
          </h1>
          <p className="text-gray-600">
            Search and compare products from multiple suppliers
            {total > 0 && <span className="ml-2 text-blue-600">({total} products found)</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Filters filters={filters} setFilters={setFilters} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <SearchBar 
              filters={filters} 
              setFilters={setFilters} 
              onSearch={() => searchProducts(true)}
              loading={loading}
            />
            
            <ProductTable products={products} loading={loading} total={total} />
          </div>
        </div>
      </div>
    </main>
  )
}
