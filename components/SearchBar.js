'use client'

import { useState, useEffect } from 'react'

export default function SearchBar({ filters, setFilters, onSearch, loading }) {
  const [query, setQuery] = useState(filters.query || '')

  // Sync query with filters
  useEffect(() => {
    setQuery(filters.query || '')
  }, [filters.query])

  const handleSearch = (e) => {
    e.preventDefault()
    setFilters({ ...filters, query })
    // Trigger immediate search on button click
    if (onSearch) {
      onSearch()
    }
  }

  const handleChange = (e) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    // Update filters immediately (will trigger auto-search via useEffect)
    setFilters({ ...filters, query: newQuery })
  }

  return (
    <form onSubmit={handleSearch} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search by SKU, model name, or description... (searches as you type)"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Tip: Search automatically updates as you type. Filters apply immediately.
      </p>
    </form>
  )
}
