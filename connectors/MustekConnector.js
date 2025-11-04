const axios = require('axios');
const BaseConnector = require('./BaseConnector');

class MustekConnector extends BaseConnector {
  constructor(supplierConfig) {
    super(supplierConfig);
    this.apiUrl = supplierConfig.api_endpoint || 'https://api.mustek.co.za/Customer/ItemsStock.ashx';
    this.token = supplierConfig.credentials?.token || process.env.MUSTEK_API_TOKEN || 'b9ec44bc-3b40-46f2-bc6d-47bfa5e2c167';
  }

  async fetchProducts(query = null) {
    try {
      const url = `${this.apiUrl}?CustomerToken=${this.token}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'DistributorSearch/2.0',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      // Parse CSV response
      // Mustek CSV format: ItemId,Description,QtyAvailable,Price,SupplierItemId,ProductLine,Status,...
      const csvData = response.data;
      const lines = csvData.split('\n').filter(line => line.trim());
      
      const products = [];
      let headerFound = false;
      let columnMap = {
        itemId: 0,
        description: 1,
        qtyAvailable: 2,
        price: 3,
        supplierItemId: 4,
        productLine: 5,
      };

      for (const line of lines) {
        // Detect and skip header row
        if (!headerFound && (line.toLowerCase().includes('itemid') || line.toLowerCase().includes('description'))) {
          headerFound = true;
          // Try to map columns from header
          const headerCols = line.split(',').map(c => c.trim().toLowerCase());
          columnMap = {
            itemId: headerCols.indexOf('itemid'),
            description: headerCols.indexOf('description'),
            qtyAvailable: headerCols.findIndex(c => c.includes('qty') || c.includes('available')),
            price: headerCols.indexOf('price'),
            supplierItemId: headerCols.findIndex(c => c.includes('supplier') || c.includes('itemid')),
            productLine: headerCols.findIndex(c => c.includes('productline') || c.includes('brand') || c.includes('line')),
          };
          continue;
        }

        const columns = line.split(',').map(col => col.trim());
        
        if (columns.length >= 4) {
          // Use correct column mapping
          const partNumber = columns[columnMap.itemId] || columns[0] || 'N/A';
          const description = columns[columnMap.description] || columns[1] || 'N/A';
          const stockValue = parseInt(columns[columnMap.qtyAvailable] || columns[2] || '0') || 0;
          const priceValue = parseFloat(columns[columnMap.price] || columns[3] || '0') || null;
          const brand = columns[columnMap.productLine] || columns[5] || columns[4] || 'Mustek';

          // Build product name from description
          let productName = description;
          if (!productName || productName === 'N/A' || productName === partNumber) {
            productName = brand !== 'Mustek' ? `${brand} ${partNumber}` : partNumber;
          }

          if (partNumber !== 'N/A' && partNumber) {
            products.push({
              sku: partNumber,
              name: productName,
              description: description,
              brand: brand,
              price: priceValue,
              stock_quantity: stockValue,
              stock_status: this.getStockStatus(stockValue),
            });
          }
        }
      }

      // Normalize products but preserve stock_quantity
      return products.map(p => {
        const normalized = this.normalizeProduct(p);
        // Ensure stock_quantity is preserved from original data
        if (p.stock_quantity !== undefined) {
          normalized.stock_quantity = p.stock_quantity;
          normalized.stock_status = this.getStockStatus(p.stock_quantity);
        }
        return normalized;
      });
    } catch (error) {
      console.error(`❌ Mustek connector error: ${error.message}`);
      throw error;
    }
  }

  async searchProducts(query) {
    const products = await this.fetchProducts();
    if (!query || !query.trim()) return products;
    
    const queryLower = query.toLowerCase();
    return products.filter(p => 
      p.sku?.toLowerCase().includes(queryLower) ||
      p.name?.toLowerCase().includes(queryLower) ||
      p.description?.toLowerCase().includes(queryLower) ||
      p.brand?.toLowerCase().includes(queryLower)
    );
  }
}

module.exports = MustekConnector;

