/**
 * Base connector class for all supplier integrations
 * Each supplier connector should extend this class
 */
class BaseConnector {
  constructor(supplierConfig) {
    this.supplierConfig = supplierConfig;
    this.name = supplierConfig.name;
    this.slug = supplierConfig.slug;
    this.type = supplierConfig.type;
  }

  /**
   * Fetch products from supplier
   * Must be implemented by each connector
   */
  async fetchProducts(query = null) {
    throw new Error('fetchProducts() must be implemented by connector');
  }

  /**
   * Normalize product data to standard format
   */
  normalizeProduct(rawProduct) {
    return {
      sku: rawProduct.sku || rawProduct.partNumber || rawProduct.id || 'N/A',
      name: rawProduct.name || rawProduct.description || rawProduct.title || 'N/A',
      description: rawProduct.description || rawProduct.longDescription || rawProduct.summary || '',
      category: rawProduct.category || rawProduct.type || null,
      brand: rawProduct.brand || rawProduct.manufacturer || null,
      price: parseFloat(rawProduct.price) || null,
      currency: rawProduct.currency || 'ZAR',
      stock_quantity: parseInt(rawProduct.stock) || parseInt(rawProduct.quantity) || parseInt(rawProduct.availableToSell) || 0,
      stock_status: this.getStockStatus(rawProduct.stock || rawProduct.quantity || rawProduct.availableToSell),
      eta_days: rawProduct.eta || rawProduct.etaDays || null,
      image_url: rawProduct.imageUrl || rawProduct.image || null,
      product_url: rawProduct.url || rawProduct.productUrl || null,
      specs: rawProduct.specs || rawProduct.specifications || {},
    };
  }

  /**
   * Determine stock status from quantity
   */
  getStockStatus(quantity) {
    const qty = parseInt(quantity) || 0;
    if (qty === 0) return 'out_of_stock';
    if (qty < 10) return 'low_stock';
    return 'in_stock';
  }

  /**
   * Search products (can be overridden for better search)
   */
  async searchProducts(query) {
    const products = await this.fetchProducts(query);
    // Simple filtering if query provided
    if (query && query.trim()) {
      const queryLower = query.toLowerCase();
      return products.filter(p => 
        p.sku?.toLowerCase().includes(queryLower) ||
        p.name?.toLowerCase().includes(queryLower) ||
        p.description?.toLowerCase().includes(queryLower)
      );
    }
    return products;
  }

  /**
   * Get connector health status
   */
  async getHealthStatus() {
    try {
      const products = await this.fetchProducts();
      return {
        status: 'healthy',
        productsCount: products.length,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date(),
      };
    }
  }
}

module.exports = BaseConnector;

