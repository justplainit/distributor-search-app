'use client'

export default function ProductTable({ products, loading, total = 0 }) {
  const getStockBadge = (status) => {
    const styles = {
      in_stock: 'bg-green-100 text-green-800',
      low_stock: 'bg-yellow-100 text-yellow-800',
      out_of_stock: 'bg-red-100 text-red-800',
    }
    const labels = {
      in_stock: 'In Stock',
      low_stock: 'Low Stock',
      out_of_stock: 'Out of Stock',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Searching products...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 text-lg mb-2">No products found</p>
        <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{products.length}</span> of <span className="font-semibold">{total}</span> products
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  {product.brand && product.brand !== 'Mustek' && (
                    <div className="text-sm text-gray-500">{product.brand}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.supplier_name || 'Mustek'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-mono">{product.sku}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {product.price ? `R${parseFloat(product.price).toFixed(2)}` : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.stock_quantity || 0}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStockBadge(product.stock_status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
