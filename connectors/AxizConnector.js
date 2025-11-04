const axios = require('axios');
const BaseConnector = require('./BaseConnector');

class AxizConnector extends BaseConnector {
  constructor(supplierConfig) {
    super(supplierConfig);
    this.apiBaseUrl = supplierConfig.api_endpoint || process.env.AXIZ_API_BASE_URL || 'https://demo.com';
    this.clientId = supplierConfig.credentials?.client_id || process.env.AXIZ_CLIENT_ID;
    this.clientSecret = supplierConfig.credentials?.client_secret || process.env.AXIZ_CLIENT_SECRET;
    this.tokenEndpoint = supplierConfig.credentials?.token_endpoint || process.env.AXIZ_TOKEN_ENDPOINT;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // For dev mode, return mock token or use actual OAuth2
      if (!this.tokenEndpoint || this.tokenEndpoint.includes('demo.com')) {
        // Mock mode - return a mock token
        this.accessToken = 'mock-axiz-token';
        this.tokenExpiry = Date.now() + (50 * 60 * 1000); // 50 minutes
        return this.accessToken;
      }

      // Real OAuth2 flow
      const data = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: process.env.AXIZ_SCOPE || 'axiz-api.customers axiz-api.erppricelist axiz-api.internalpricelist axiz-api.markets axiz-api.salesordertracking',
      });

      const response = await axios.post(this.tokenEndpoint, data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (50 * 60 * 1000);
        return this.accessToken;
      }

      throw new Error('No access token in response');
    } catch (error) {
      console.error('Axiz token error:', error.message);
      // Return mock token for dev mode
      this.accessToken = 'mock-axiz-token';
      this.tokenExpiry = Date.now() + (50 * 60 * 1000);
      return this.accessToken;
    }
  }

  async fetchProducts(query = null) {
    try {
      const token = await this.getAccessToken();
      
      // For dev mode without real API, return mock products
      if (this.apiBaseUrl.includes('demo.com') || !this.apiBaseUrl || !token || token === 'mock-axiz-token') {
        console.log('📦 Axiz: Using mock products (no real API configured)');
        return this.getMockProducts();
      }

      // Real Axiz API call - Search Products endpoint (better for searching)
      // POST {{EnvironmentURL}}/api/services/app/Products/SearchProducts
      const url = `${this.apiBaseUrl}/api/services/app/Products/SearchProducts`;
      
      // Build request body according to Search Products API docs
      const requestBody = {
        searchText: query || '', // Full text search - better than Price List filter
        pageIndex: 0, // Start at page 0
        maxResultCount: 1000, // Max products per page
        market: '14', // General Market (as per API docs)
        filters: {
          availability: [], // Empty = all products (1 = in stock only)
          brands: [], // Empty = all brands
          categories: [], // Empty = all categories
          tags: [], // Empty = no tag filters
          hasRichDataFilter: true,
          skipCaching: false,
          useFuzzySearch: true, // Enable fuzzy search for better matching
          shouldApplyGlobalSettingsFilter: true,
        },
        viewId: '0', // Default outlet store
        sortOptions: {
          sortColumn: null,
          sortOrder: 1,
        },
      };

      console.log(`🔍 Axiz: Fetching products from Search Products API (searchText: "${query || 'all'}")`);
      
      const response = await axios.post(url, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout for large responses
      });

      // Handle paginated results - API returns items array
      let allProducts = [];
      
      if (response.data && response.data.result && response.data.result.items && Array.isArray(response.data.result.items)) {
        allProducts = response.data.result.items.map(item => this.normalizeAxizProduct(item));
        console.log(`✅ Axiz: Fetched ${allProducts.length} products from API (total available: ${response.data.result.totalCount || 'unknown'})`);
        
        // If we got 1000 results, might need to fetch more pages
        if (allProducts.length === 1000 && response.data.result.totalCount > 1000) {
          console.log(`⚠️ Axiz: Got max results (1000 of ${response.data.result.totalCount}). Consider implementing pagination for more products.`);
        }
      } else {
        console.log(`⚠️ Axiz: Unexpected API response structure`);
      }

      return allProducts;
    } catch (error) {
      console.error(`❌ Axiz connector error: ${error.message}`);
      if (error.response) {
        console.error(`   Response status: ${error.response.status}`);
        console.error(`   Response data:`, error.response.data);
      }
      // Return mock products in case of error (dev mode fallback)
      console.log('📦 Axiz: Falling back to mock products');
      return this.getMockProducts();
    }
  }

  // Normalize Axiz API response to our standard format
  // Handles both Search Products API and Search Price List API responses
  normalizeAxizProduct(axizProduct) {
    // Search Products API uses: productIdentifier, name, availableToSell, brandInfo
    // Search Price List API uses: productCode, productDescription, onHand, brand
    const sku = axizProduct.productIdentifier || axizProduct.productCode || axizProduct.itemId || axizProduct.vendorId || 'N/A';
    const name = axizProduct.name || this.extractProductName(axizProduct.productDescription || '');
    const description = axizProduct.description || axizProduct.productDescription || '';
    const category = axizProduct.category || axizProduct.productCategory || null;
    const brandName = axizProduct.brandInfo?.brandName || axizProduct.brand?.brandName || null;
    const price = parseFloat(axizProduct.price) || null;
    const currency = axizProduct.currencyCode || axizProduct.salesCurrency || axizProduct.currency || 'ZAR';
    const stockQty = parseInt(axizProduct.availableToSell) || parseInt(axizProduct.onHand) || 0;
    const imageUrl = axizProduct.imageUrl || axizProduct.defaultImageUrl || (axizProduct.imageGallery && axizProduct.imageGallery[0]) || null;
    
    return {
      sku: sku,
      name: name,
      description: description,
      category: category,
      brand: brandName,
      price: price,
      currency: currency,
      stock_quantity: stockQty,
      stock_status: this.getStockStatus(stockQty),
      image_url: imageUrl,
      product_url: null, // Axiz API doesn't provide product URLs
      eta_days: axizProduct.estimatedTimeOfArrival ? this.calculateETADays(axizProduct.estimatedTimeOfArrival) : null,
      specs: {
        productType: axizProduct.itemType || axizProduct.productType || null,
        vendorId: axizProduct.vendorId || null,
        discount: axizProduct.discount || axizProduct.discountPercentage || 0,
        promotions: axizProduct.promotions || [],
        additionalInfo: axizProduct.additionalInfo || {},
      },
    };
  }

  // Calculate ETA in days from date
  calculateETADays(etaDate) {
    if (!etaDate) return null;
    try {
      const eta = new Date(etaDate);
      const now = new Date();
      const diffTime = eta - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : null;
    } catch (error) {
      return null;
    }
  }

  // Extract cleaner product name from long description
  extractProductName(description) {
    if (!description) return 'N/A';
    
    // Try to extract model number and brand from description
    // Example: "HP Elitebook 650 G10 - Core i7-1355U..." -> "HP Elitebook 650 G10"
    const parts = description.split(' - ');
    if (parts.length > 0) {
      return parts[0].trim();
    }
    
    // If no dash, take first 80 characters
    return description.length > 80 ? description.substring(0, 80) + '...' : description;
  }

  getMockProducts() {
    // Mock Axiz products for dev/testing - includes Dell products
    // Using realistic Axiz product code format (alphanumeric codes)
    const mockProducts = [
      // Dell Laptops
      {
        sku: '85B44EA',
        name: 'Dell Latitude 5430 14" Laptop',
        description: 'Dell Latitude 5430 14" FHD Business Laptop - Intel Core i5-1235U, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 18999.00,
        stock_quantity: 12,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '81A38EA',
        name: 'Dell XPS 13 Plus 9320',
        description: 'Dell XPS 13 Plus 9320 - 13.4" OLED 3.5K Touch, Intel Core i7-1260P, 16GB RAM, 512GB SSD',
        brand: 'Dell',
        price: 34999.00,
        stock_quantity: 8,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B45EA',
        name: 'Dell Inspiron 15 3520',
        description: 'Dell Inspiron 15 3520 - 15.6" FHD, Intel Core i5-1235U, 8GB RAM, 512GB SSD, Windows 11',
        brand: 'Dell',
        price: 12999.00,
        stock_quantity: 24,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B64EA',
        name: 'Dell Inspiron 15 3525',
        description: 'Dell Inspiron 15 3525 - 15.6" FHD, AMD Ryzen 5 5625U, 8GB RAM, 256GB SSD, Windows 11',
        brand: 'Dell',
        price: 11999.00,
        stock_quantity: 18,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B65EA',
        name: 'Dell Inspiron 15 3511',
        description: 'Dell Inspiron 15 3511 - 15.6" FHD, Intel Core i3-1115G4, 8GB RAM, 256GB SSD, Windows 11',
        brand: 'Dell',
        price: 9999.00,
        stock_quantity: 32,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B66EA',
        name: 'Dell Inspiron 14 5420',
        description: 'Dell Inspiron 14 5420 - 14" FHD, Intel Core i5-1240P, 16GB RAM, 512GB SSD, Windows 11',
        brand: 'Dell',
        price: 14999.00,
        stock_quantity: 16,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B67EA',
        name: 'Dell Inspiron 16 5620',
        description: 'Dell Inspiron 16 5620 - 16" FHD+, Intel Core i7-1255U, 16GB RAM, 512GB SSD, Windows 11',
        brand: 'Dell',
        price: 19999.00,
        stock_quantity: 12,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B68EA',
        name: 'Dell Inspiron 15 3510',
        description: 'Dell Inspiron 15 3510 - 15.6" FHD, Intel Core i5-1035G1, 8GB RAM, 256GB SSD, Windows 11',
        brand: 'Dell',
        price: 10999.00,
        stock_quantity: 28,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B69EA',
        name: 'Dell Inspiron 14 5410',
        description: 'Dell Inspiron 14 5410 - 14" FHD, Intel Core i5-1135G7, 8GB RAM, 512GB SSD, Windows 11',
        brand: 'Dell',
        price: 13999.00,
        stock_quantity: 20,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B70EA',
        name: 'Dell Inspiron 15 5510',
        description: 'Dell Inspiron 15 5510 - 15.6" FHD, Intel Core i7-11370H, 16GB RAM, 512GB SSD, Windows 11',
        brand: 'Dell',
        price: 17999.00,
        stock_quantity: 14,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B71EA',
        name: 'Dell Inspiron 15 3000',
        description: 'Dell Inspiron 15 3000 - 15.6" FHD, Intel Celeron N4020, 4GB RAM, 128GB SSD, Windows 11',
        brand: 'Dell',
        price: 7999.00,
        stock_quantity: 45,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B72EA',
        name: 'Dell Inspiron 14 3000',
        description: 'Dell Inspiron 14 3000 - 14" FHD, Intel Pentium Silver N5030, 4GB RAM, 128GB SSD, Windows 11',
        brand: 'Dell',
        price: 7499.00,
        stock_quantity: 38,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '5F7N5ES',
        name: 'Dell Precision 3580 Workstation',
        description: 'Dell Precision 3580 Mobile Workstation - 15.6" FHD, Intel Core i7-13800H, 32GB RAM, 1TB SSD, NVIDIA RTX A500',
        brand: 'Dell',
        price: 54999.00,
        stock_quantity: 5,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      // Dell Monitors
      {
        sku: '884V6EA',
        name: 'Dell UltraSharp U2723DE 27" 4K Monitor',
        description: 'Dell UltraSharp U2723DE 27" 4K UHD IPS Monitor with USB-C, HDMI, DisplayPort',
        brand: 'Dell',
        price: 12999.00,
        stock_quantity: 18,
        stock_status: 'in_stock',
        category: 'monitor',
      },
      {
        sku: '6B2T6EA',
        name: 'Dell P2723DE 27" QHD Monitor',
        description: 'Dell P2723DE 27" QHD IPS Monitor with USB-C Hub, Height Adjustable Stand',
        brand: 'Dell',
        price: 8999.00,
        stock_quantity: 32,
        stock_status: 'in_stock',
        category: 'monitor',
      },
      {
        sku: '336H2EA',
        name: 'Dell S2722DC 27" QHD Monitor',
        description: 'Dell S2722DC 27" QHD USB-C Monitor with Built-in Speakers',
        brand: 'Dell',
        price: 6999.00,
        stock_quantity: 28,
        stock_status: 'in_stock',
        category: 'monitor',
      },
      // Dell Desktops
      {
        sku: '6S7V0EA',
        name: 'Dell OptiPlex 7010 SFF Desktop',
        description: 'Dell OptiPlex 7010 Small Form Factor - Intel Core i5-13500, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 16999.00,
        stock_quantity: 15,
        stock_status: 'in_stock',
        category: 'desktop',
      },
      {
        sku: '6S7U8EA',
        name: 'Dell Vostro 3020 Desktop',
        description: 'Dell Vostro 3020 Desktop - Intel Core i5-12400, 8GB RAM, 256GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 11999.00,
        stock_quantity: 22,
        stock_status: 'in_stock',
        category: 'desktop',
      },
      {
        sku: '85B46EA',
        name: 'Dell Vostro 3420 14" Laptop',
        description: 'Dell Vostro 3420 14" FHD Laptop - Intel Core i5-1235U, 8GB RAM, 256GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 13999.00,
        stock_quantity: 18,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B47EA',
        name: 'Dell Vostro 3520 15.6" Laptop',
        description: 'Dell Vostro 3520 15.6" FHD Laptop - Intel Core i7-1255U, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 18999.00,
        stock_quantity: 15,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B48EA',
        name: 'Dell Vostro 3510 15.6" Laptop',
        description: 'Dell Vostro 3510 15.6" FHD Laptop - Intel Core i5-1135G7, 8GB RAM, 256GB SSD, Windows 11',
        brand: 'Dell',
        price: 11999.00,
        stock_quantity: 28,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B49EA',
        name: 'Dell Vostro 5620 16" Laptop',
        description: 'Dell Vostro 5620 16" FHD+ Laptop - Intel Core i5-1240P, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 21999.00,
        stock_quantity: 12,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B50EA',
        name: 'Dell Vostro 3888 SFF Desktop',
        description: 'Dell Vostro 3888 Small Form Factor Desktop - Intel Core i5-10400, 8GB RAM, 256GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 10999.00,
        stock_quantity: 25,
        stock_status: 'in_stock',
        category: 'desktop',
      },
      // Dell Accessories
      {
        sku: '85B51EA',
        name: 'Dell USB-C Hub WD19TB',
        description: 'Dell USB-C Hub WD19TB - Thunderbolt 3 Docking Station with 180W Power Delivery',
        brand: 'Dell',
        price: 6999.00,
        stock_quantity: 45,
        stock_status: 'in_stock',
        category: 'accessories',
      },
      {
        sku: '85B52EA',
        name: 'Dell KM5221W Wireless Keyboard & Mouse',
        description: 'Dell KM5221W Wireless Keyboard and Mouse Combo with 2.4GHz and Bluetooth connectivity',
        brand: 'Dell',
        price: 1299.00,
        stock_quantity: 67,
        stock_status: 'in_stock',
        category: 'accessories',
      },
      {
        sku: '85B53EA',
        name: 'Dell UltraSharp Webcam WB7022',
        description: 'Dell UltraSharp Webcam WB7022 - 4K UHD with HDR, Auto-Focus, Noise Cancellation',
        brand: 'Dell',
        price: 3999.00,
        stock_quantity: 31,
        stock_status: 'in_stock',
        category: 'accessories',
      },
      // HP Products (Axiz also distributes HP)
      // HP Products (Axiz also distributes HP) - using unique SKUs
      {
        sku: 'HP85B44EA',
        name: 'HP Elitebook 650 G10',
        description: 'HP Elitebook 650 G10 - Core i7-1355U 16GB (1x16GB) DDR4 512GB PCIe NVMe 15.6 FHD UWVA 250 WWAN HDC IR',
        brand: 'HPIC',
        price: 20352.45,
        stock_quantity: 10,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: 'HP81A38EA',
        name: 'HP EliteBook 830 G10 LTE',
        description: 'HP EliteBook 830 G10 LTE - Core i5-1335U 16GB (1x16GB) DDR4 512GB PCIe NVMe 13.3 WUXGA Windows 11 Pro 64',
        brand: 'HPIC',
        price: 25306.18,
        stock_quantity: 38,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: 'HP85B45EA',
        name: 'HP EliteBook 850 G10',
        description: 'HP EliteBook 850 G10 - Core i7-1355U 16GB DDR4 512GB SSD 15.6" FHD Windows 11 Pro',
        brand: 'HPIC',
        price: 23001.52,
        stock_quantity: 14,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: 'HP884V6EA',
        name: 'HP ProOne 440 G9 23.8 Touch AiO',
        description: 'HP ProOne 440 G9 23.8 Touch AiO - Core i7-13700T 16GB DDR4 3200 512GB PCIe NVMe 23.8 inch Touch AiO',
        brand: 'HPIC',
        price: 19913.93,
        stock_quantity: 2,
        stock_status: 'in_stock',
        category: 'aio (all in one)',
      },
      {
        sku: 'HP336H2EA',
        name: 'HP Elitebook 830 G8',
        description: 'HP Elitebook 830 G8 - Core i5-1135G7 8GB (1x8GB) 256GB PCIe NVMe 13.3 FHD UWVA 250 WWAN 4G HDC',
        brand: 'HPIC',
        price: 19913.93,
        stock_quantity: 2,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: 'HP6S7V0EA',
        name: 'HP 250 G9 Notebook',
        description: 'HP 250 G9 Notebook Core i3-1215U 8GB (1x8GB) 1D DDR4 256GB PCIe NVMe 15.6 FHD AG SVA 250 WWAN',
        brand: 'HPIC',
        price: 6499.30,
        stock_quantity: 0,
        stock_status: 'out_of_stock',
        category: 'laptop',
      },
      {
        sku: 'HP6S7U8EA',
        name: 'HP Notebook 250 G9',
        description: 'HP Notebook 250 G9 - Core i5-1235U 8GB (1x8GB) 256GB PCIe SSD 15.6 inch FHD (1920x1080) Anti-Glare',
        brand: 'HPIC',
        price: 14777.41,
        stock_quantity: 0,
        stock_status: 'out_of_stock',
        category: 'laptop',
      },
      {
        sku: 'HP5F7N5ES',
        name: 'HP Z1 Entry Tower G9 IDS',
        description: 'HP Z1 Entry Tower G9 IDS- Intel i9-12900 2.40G 16 cores 65W ECC 32GB (2x16GB) DDR5 1TB PCIe-4x4 2280 NVMe',
        brand: 'HPIC',
        price: 40680.48,
        stock_quantity: 2,
        stock_status: 'in_stock',
        category: 'workstation',
      },
      {
        sku: 'HP6B2T6EA',
        name: 'HP Pro Tower 290 G9 TWR',
        description: 'HP Pro Tower 290 G9 TWR - Core i7-12700 16GB (1x16GB) 512GB SSD Win11 Pro (Win10 Downgrade) DVD-WR ODD',
        brand: 'HPIC',
        price: 18378.30,
        stock_quantity: 0,
        stock_status: 'out_of_stock',
        category: 'desktop',
      },
      // More Dell Products
      {
        sku: '85B54EA',
        name: 'Dell OptiPlex 7090 Micro Desktop',
        description: 'Dell OptiPlex 7090 Micro Desktop - Intel Core i5-11500T, 8GB RAM, 256GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 14999.00,
        stock_quantity: 20,
        stock_status: 'in_stock',
        category: 'desktop',
      },
      {
        sku: '85B55EA',
        name: 'Dell Latitude 7330 13.3" Laptop',
        description: 'Dell Latitude 7330 13.3" FHD Laptop - Intel Core i7-1265U, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 22999.00,
        stock_quantity: 14,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B56EA',
        name: 'Dell OptiPlex 7010 MT Desktop',
        description: 'Dell OptiPlex 7010 Mini Tower - Intel Core i7-13700, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 19999.00,
        stock_quantity: 18,
        stock_status: 'in_stock',
        category: 'desktop',
      },
      {
        sku: '85B57EA',
        name: 'Dell UltraSharp U2720Q 27" 4K Monitor',
        description: 'Dell UltraSharp U2720Q 27" 4K UHD IPS Monitor with USB-C, HDMI, DisplayPort, Height Adjustable Stand',
        brand: 'Dell',
        price: 11999.00,
        stock_quantity: 26,
        stock_status: 'in_stock',
        category: 'monitor',
      },
      {
        sku: '85B58EA',
        name: 'Dell P2422H 24" FHD Monitor',
        description: 'Dell P2422H 24" FHD IPS Monitor with VGA, HDMI, DisplayPort, Height Adjustable Stand',
        brand: 'Dell',
        price: 3999.00,
        stock_quantity: 58,
        stock_status: 'in_stock',
        category: 'monitor',
      },
      {
        sku: '85B59EA',
        name: 'Dell Latitude 7430 14" Laptop',
        description: 'Dell Latitude 7430 14" FHD Laptop - Intel Core i5-1235U, 8GB RAM, 256GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 16999.00,
        stock_quantity: 16,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B60EA',
        name: 'Dell Precision 5570 Workstation',
        description: 'Dell Precision 5570 Mobile Workstation - 15.6" FHD, Intel Core i7-12800H, 32GB RAM, 1TB SSD, NVIDIA RTX A2000',
        brand: 'Dell',
        price: 59999.00,
        stock_quantity: 4,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      {
        sku: '85B61EA',
        name: 'Dell OptiPlex 5000 SFF Desktop',
        description: 'Dell OptiPlex 5000 Small Form Factor - Intel Core i5-12500, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 15999.00,
        stock_quantity: 22,
        stock_status: 'in_stock',
        category: 'desktop',
      },
      {
        sku: '85B62EA',
        name: 'Dell UltraSharp U3821DW 38" Monitor',
        description: 'Dell UltraSharp U3821DW 38" WQHD+ Curved Monitor with USB-C, HDMI, DisplayPort, Thunderbolt 3',
        brand: 'Dell',
        price: 24999.00,
        stock_quantity: 8,
        stock_status: 'in_stock',
        category: 'monitor',
      },
      {
        sku: '85B63EA',
        name: 'Dell Latitude 5530 15.6" Laptop',
        description: 'Dell Latitude 5530 15.6" FHD Laptop - Intel Core i5-1235U, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Dell',
        price: 19999.00,
        stock_quantity: 12,
        stock_status: 'in_stock',
        category: 'laptop',
      },
      // Lenovo Products (Axiz also distributes Lenovo)
      {
        sku: '20VYS19E00',
        name: 'Lenovo ThinkPad E14 Gen 5',
        description: 'Lenovo ThinkPad E14 Gen 5 - 14" FHD, AMD Ryzen 5 7530U, 16GB RAM, 512GB SSD, Windows 11 Pro',
        brand: 'Lenovo',
        price: 18999.00,
        stock_quantity: 15,
        stock_status: 'in_stock',
        category: 'laptop',
      },
    ];

      // Normalize products but preserve stock_quantity
      return mockProducts.map(p => {
        const normalized = this.normalizeProduct(p);
        // Ensure stock_quantity is preserved from original data
        if (p.stock_quantity !== undefined) {
          normalized.stock_quantity = p.stock_quantity;
          normalized.stock_status = this.getStockStatus(p.stock_quantity);
        }
        return normalized;
      });
  }

  async searchProducts(query) {
    // If query is provided, pass it to fetchProducts which will use it in the API filter
    // The Axiz API filter matches products that START with the filter, so we also do client-side filtering
    const products = await this.fetchProducts(query);
    if (!query || !query.trim()) return products;
    
    const queryLower = query.toLowerCase();
    return products.filter(p => 
      p.sku?.toLowerCase().includes(queryLower) ||
      p.name?.toLowerCase().includes(queryLower) ||
      p.description?.toLowerCase().includes(queryLower) ||
      p.brand?.toLowerCase().includes(queryLower) ||
      p.category?.toLowerCase().includes(queryLower)
    );
  }
}

module.exports = AxizConnector;

