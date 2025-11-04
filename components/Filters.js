'use client'

export default function Filters({ filters, setFilters }) {
  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value })
    // Filters will auto-trigger search via useEffect in parent
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow sticky top-4">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      <p className="text-xs text-gray-500 mb-4">Filters apply automatically</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier
          </label>
          <select
            value={filters.supplier}
            onChange={(e) => handleFilterChange('supplier', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Suppliers</option>
            <option value="mustek">Mustek</option>
            <option value="axiz">Axiz</option>
            <option value="tarsus">Tarsus</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Status
          </label>
          <select
            value={filters.stockStatus}
            onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Price (ZAR)
          </label>
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Price (ZAR)
          </label>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="100000"
            min="0"
          />
        </div>

        <button
          onClick={() => {
            setFilters({
              query: '',
              supplier: '',
              category: '',
              minPrice: '',
              maxPrice: '',
              stockStatus: '',
            })
          }}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  )
}
