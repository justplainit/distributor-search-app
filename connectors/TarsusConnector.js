const axios = require('axios');
const BaseConnector = require('./BaseConnector');

class TarsusConnector extends BaseConnector {
  constructor(supplierConfig) {
    super(supplierConfig);
    this.apiUrl = supplierConfig.api_endpoint || 'https://feedgen.tarsusonline.co.za/api/DataFeed/Customer-ProductCatalogue';
    this.token = supplierConfig.credentials?.token || process.env.TARSUS_API_TOKEN;
  }

  async fetchProducts(query = null) {
    try {
      if (!this.token) {
        console.error('❌ Tarsus: No API token configured');
        return [];
      }

      const url = this.apiUrl;
      
      // Try with retry logic for rate limiting
      let retries = 3;
      let response = null;
      
      while (retries > 0) {
        try {
          response = await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/json',
              'User-Agent': 'DistributorSearch/2.0',
            },
            timeout: 60000, // 60 second timeout for large responses
          });
          
          // Check if response contains rate limit message
          if (response.data && response.data.Message && response.data.Message.toLowerCase().includes('too many requests')) {
            throw new Error('Rate limited: ' + response.data.Message);
          }
          
          // If we get here, request was successful
          break;
        } catch (error) {
          const isRateLimit = error.response?.status === 403 || 
                             (error.response?.data?.Message && error.response.data.Message.toLowerCase().includes('too many requests')) ||
                             (error.message && error.message.toLowerCase().includes('rate limited'));
          
          if (isRateLimit) {
            retries--;
            if (retries > 0) {
              const waitTime = (4 - retries) * 10; // 10, 20, 30 seconds - longer waits
              console.log(`⚠️ Tarsus: Rate limited. Waiting ${waitTime}s before retry (${retries} left)...`);
              await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
              continue;
            } else {
              console.error(`❌ Tarsus: Rate limit retries exhausted. API requires longer wait time.`);
              throw error;
            }
          }
          // If not rate limit, throw error immediately
          throw error;
        }
      }
      
      if (!response) {
        throw new Error('Failed to get response after retries');
      }

      // Tarsus API returns JSON object with "Products" key containing the array
      let products = [];
      
      if (Array.isArray(response.data)) {
        // Direct array response
        products = response.data;
      } else if (response.data && Array.isArray(response.data.Products)) {
        // Response has "Products" key (capital P) - this is the actual format
        products = response.data.Products;
      } else if (response.data && Array.isArray(response.data.products)) {
        // Response has "products" key (lowercase)
        products = response.data.products;
      } else if (response.data && Array.isArray(response.data.items)) {
        // Response has "items" key
        products = response.data.items;
      } else if (response.data && typeof response.data === 'object') {
        // Try to extract array from response
        console.log(`⚠️ Tarsus: Response is object. Keys: ${Object.keys(response.data).join(', ')}`);
        const possibleArray = Object.values(response.data).find(v => Array.isArray(v));
        if (possibleArray) {
          products = possibleArray;
        } else {
          console.log(`⚠️ Tarsus: No array found in response`);
          return [];
        }
      } else {
        console.log(`⚠️ Tarsus: Unexpected API response structure: ${typeof response.data}`);
        return [];
      }

      console.log(`✅ Tarsus: Fetched ${products.length} products from API`);

      // Normalize products
      const normalizedProducts = products.map(item => this.normalizeTarsusProduct(item));

      // If query provided, filter products
      if (query && query.trim()) {
        const queryLower = query.toLowerCase();
        return normalizedProducts.filter(p => 
          p.sku?.toLowerCase().includes(queryLower) ||
          p.name?.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower) ||
          p.brand?.toLowerCase().includes(queryLower) ||
          p.category?.toLowerCase().includes(queryLower)
        );
      }

      return normalizedProducts;
    } catch (error) {
      console.error(`❌ Tarsus connector error: ${error.message}`);
      if (error.response) {
        console.error(`   Response status: ${error.response.status}`);
        if (error.response.status === 403) {
          const message = error.response.data?.Message || error.response.data?.message || 'Forbidden';
          if (message.toLowerCase().includes('too many requests')) {
            console.error(`   ⚠️ Rate limited by Tarsus API. Please wait before retrying.`);
          } else {
            console.error(`   Response data:`, error.response.data);
          }
        } else {
          console.error(`   Response data:`, error.response.data);
        }
      }
      return [];
    }
  }

  // Normalize Tarsus API response to our standard format
  normalizeTarsusProduct(tarsusProduct) {
    // Calculate price with VAT (Price_ex_Vat * 1.15 for 15% VAT in ZA)
    const priceExVat = parseFloat(tarsusProduct.Price_ex_Vat) || null;
    const priceWithVat = priceExVat ? priceExVat * 1.15 : null;

    // Calculate ETA days if ETA_Date is provided
    let etaDays = null;
    if (tarsusProduct.ETA_Date) {
      try {
        const eta = new Date(tarsusProduct.ETA_Date);
        const now = new Date();
        const diffTime = eta - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        etaDays = diffDays > 0 ? diffDays : null;
      } catch (error) {
        // Ignore date parsing errors
      }
    }

    return {
      sku: tarsusProduct.Product_Number || tarsusProduct.Manufacturing_Part_Number || 'N/A',
      name: tarsusProduct.Short_Advertising_Description || tarsusProduct.Product_Description || 'N/A',
      description: tarsusProduct.Product_Description || tarsusProduct.Short_Advertising_Description || '',
      category: tarsusProduct.Category || tarsusProduct.Product_Type || null,
      brand: tarsusProduct.Manufacturer || null,
      price: priceWithVat, // Price with VAT
      currency: 'ZAR',
      stock_quantity: parseInt(tarsusProduct.Available_Stock) || 0,
      stock_status: this.getStockStatus(tarsusProduct.Available_Stock),
      image_url: tarsusProduct.Image_URL || null,
      product_url: null, // Tarsus API doesn't provide product URLs
      eta_days: etaDays,
      specs: {
        productType: tarsusProduct.Product_Type || null,
        barcode: tarsusProduct.BarCode || null,
        serialized: tarsusProduct.Serialized || 'No',
        discount: tarsusProduct.Product_Discounted === 'Yes' ? parseFloat(tarsusProduct.Discount_Quantity) || 0 : 0,
        nonDiscountPrice: parseFloat(tarsusProduct.Non_Discount_Price_ex_Vat) || null,
        dimensions: {
          width: parseFloat(tarsusProduct.Each_Width) || null,
          height: parseFloat(tarsusProduct.Each_Height) || null,
          length: parseFloat(tarsusProduct.Each_Length) || null,
          weight: parseFloat(tarsusProduct.Each_Weight) || null,
        },
        exportDate: tarsusProduct.Export_Date || null,
      },
    };
  }

  async searchProducts(query) {
    return await this.fetchProducts(query);
  }
}

module.exports = TarsusConnector;
