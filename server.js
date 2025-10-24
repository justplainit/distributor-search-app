const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'tarsus-products.xml');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Only XML files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Simple password protection (Vercel handles the rest)
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Distributor Search"');
    return res.status(401).send('Authentication required');
  }
  
  const credentials = Buffer.from(auth.slice(6), 'base64').toString();
  const [username, password] = credentials.split(':');
  
  // Change these credentials!
  if (username === 'admin' && password === 'Distributor2024!Secure') {
    return next();
  }
  
  res.setHeader('WWW-Authenticate', 'Basic realm="Distributor Search"');
  return res.status(401).send('Invalid credentials');
};

// Apply password protection to all routes
app.use(basicAuth);

app.use(express.static('public'));

// XML Parser instance
const xmlParser = new XMLParser();

/**
 * DISTRIBUTORS CONFIGURATION
 * 
 * To add a new distributor:
 * 1. Add a new object to the distributors array below
 * 2. Set the name, type ("json" or "xml"), getUrl function, optional headers, and map function
 * 3. The map function should transform the distributor's response into our standard format:
 *    { distributor: string, sku: string, price: string, stock: string }
 */

// Axiz API token cache
let axizToken = null;
let axizTokenExpiry = null;

// Function to get Axiz access token
const getAxizAccessToken = async () => {
  // Check if we have a valid cached token
  if (axizToken && axizTokenExpiry && Date.now() < axizTokenExpiry) {
    return axizToken;
  }

  try {
    console.log('🔑 Obtaining Axiz access token...');
    
    const data = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AXIZ_CLIENT_ID,
      client_secret: process.env.AXIZ_CLIENT_SECRET,
      scope: process.env.AXIZ_SCOPE,
    });

    const response = await axios.post(process.env.AXIZ_TOKEN_ENDPOINT, data, {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
    });

    if (response.data && response.data.access_token) {
      axizToken = response.data.access_token;
      axizTokenExpiry = Date.now() + (50 * 60 * 1000);
      console.log('✅ Successfully obtained Axiz access token');
      return axizToken;
    } else {
      throw new Error('No access token in response');
    }
  } catch (error) {
    console.error('Error obtaining Axiz access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to obtain Axiz access token');
  }
};

const distributors = [
  // Axiz Integration - OAuth2 Client Credentials
  {
    name: 'Axiz',
    type: 'json',
    getUrl: async (query) => {
      const token = await getAxizAccessToken();
      // Try different Axiz API endpoints
      const endpoints = [
        `${process.env.AXIZ_API_BASE_URL}/api/services/app/Products/GetProductDetails`,
        `${process.env.AXIZ_API_BASE_URL}/api/services/app/Products/SearchProductDetails`,
        `${process.env.AXIZ_API_BASE_URL}/api/Products/SearchProductDetails`,
        `${process.env.AXIZ_API_BASE_URL}/api/Products/GetProductDetails`
      ];
      return endpoints[0]; // Start with the first one
    },
    headers: async () => {
      const token = await getAxizAccessToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    },
    // Override the default axios call to use POST with body
    makeRequest: async (url, headers, query) => {
      // Try SearchProducts first (general search)
      try {
        console.log(`🔍 Searching Axiz products for: ${query}`);
        const searchResponse = await axios.post(
          `${process.env.AXIZ_API_BASE_URL}/api/services/app/Products/SearchProducts`,
          {
            pageIndex: 0,
            maxResultCount: 10,
            market: "14", // South Africa market
            searchText: query,
            filters: {
              availability: [],
              brands: [],
              categories: [],
              tags: [],
              hasRichDataFilter: true,
              skipCaching: false,
              useFuzzySearch: true,
              shouldApplyGlobalSettingsFilter: true
            },
            viewId: "0",
            sortOptions: {
              sortOrder: 1
            }
          },
          { 
            headers,
            timeout: 10000 
          }
        );
        console.log(`✅ Found ${searchResponse.data?.result?.totalCount || 0} products via SearchProducts`);
        return searchResponse;
      } catch (searchError) {
        console.log(`❌ SearchProducts failed: ${searchError.response?.status || searchError.message}`);
        
        // If general search fails, try FindProductById for specific SKU
        try {
          console.log(`🔍 Trying FindProductById for specific SKU: ${query}`);
          const findResponse = await axios.post(
            `${process.env.AXIZ_API_BASE_URL}/api/services/app/Products/FindProductById`,
            {
              brand: 0, // Try with brand 0 first (will need to be adjusted based on actual brand)
              identifier: query,
              market: "14"
            },
            { 
              headers,
              timeout: 10000 
            }
          );
          console.log(`✅ Found product via FindProductById`);
          return findResponse;
        } catch (findError) {
          console.log(`❌ FindProductById failed: ${findError.response?.status || findError.message}`);
          throw new Error(`Both Axiz search methods failed: ${searchError.message}, ${findError.message}`);
        }
      }
    },
    map: (response) => {
      console.log('🔍 Axiz API Response:', JSON.stringify(response.data, null, 2));
      
      // Transform Axiz API response to our standard format
      if (response.data && response.data.result) {
        let products = [];
        
        // Handle SearchProducts response (array of items)
        if (response.data.result.items && Array.isArray(response.data.result.items)) {
          products = response.data.result.items;
        }
        // Handle FindProductById response (single product)
        else if (response.data.result.productIdentifier) {
          products = [response.data.result];
        }
        // Handle direct result array
        else if (Array.isArray(response.data.result)) {
          products = response.data.result;
        }
        
        return products.map(product => ({
          distributor: 'Axiz',
          sku: product.productIdentifier || product.sku || product.identifier || 'N/A',
          price: product.price ? `R${product.price.toFixed(2)}` : 'N/A',
          stock: product.availableToSell || product.stock || product.quantity || 'N/A',
          name: product.name || 'N/A',
          brand: product.brandInfo?.brandName || product.brand || 'N/A',
          description: product.description || product.additionalInfo?.ProductDescription || product.additionalInfo?.LongDescription || 'N/A'
        }));
      }
      
      console.log('⚠️ No products found in Axiz response');
      return [];
    }
  },

  // Tarsus Integration - Manual XML File Upload
  {
    name: 'Tarsus',
    type: 'xml',
    getUrl: (query) => {
      // Tarsus uses manual XML file upload, not URL-based feeds
      return 'manual-upload';
    },
    headers: () => {
      return {};
    },
    makeRequest: async (url, headers, query) => {
      try {
        console.log(`🔍 Searching Tarsus XML data for: ${query}`);
        
        // Check if Tarsus XML file exists
        const fs = require('fs');
        const path = require('path');
        const xmlFilePath = path.join(__dirname, 'uploads', 'tarsus-products.xml');
        
        if (!fs.existsSync(xmlFilePath)) {
          console.log('⚠️ No Tarsus XML file uploaded yet');
          return { data: '<products></products>' }; // Return empty XML
        }
        
        // Read the uploaded XML file
        const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
        console.log(`✅ Loaded Tarsus XML file (${xmlData.length} characters)`);
        
        return { data: xmlData };
        
      } catch (error) {
        console.error(`❌ Error reading Tarsus XML file: ${error.message}`);
        throw error;
      }
    },
    map: (response) => {
      try {
        console.log('🔍 Parsing Tarsus XML feed...');
        
        // Parse XML response
        const xmlData = xmlParser.parse(response.data);
        
        // Extract products from XML structure
        // Note: This structure will need to be adjusted based on actual Tarsus XML format
        let products = [];
        
        if (xmlData.products && xmlData.products.product) {
          products = Array.isArray(xmlData.products.product) 
            ? xmlData.products.product 
            : [xmlData.products.product];
        } else if (xmlData.product) {
          products = Array.isArray(xmlData.product) 
            ? xmlData.product 
            : [xmlData.product];
        }
        
        return products.map(product => ({
          distributor: 'Tarsus',
          sku: product.sku || product.code || product.id || 'N/A',
          price: product.price ? `R${parseFloat(product.price).toFixed(2)}` : 'N/A',
          stock: product.stock || product.quantity || product.available || 'N/A',
          name: product.name || product.title || product.description || 'N/A',
          brand: product.brand || product.manufacturer || 'N/A',
          description: product.description || product.longDescription || product.summary || 'N/A'
        }));
        
      } catch (error) {
        console.error('❌ Error parsing Tarsus XML:', error.message);
        return [];
      }
    }
  }

  // Add more distributors here following the same pattern:
  // {
  //   name: 'Distributor C',
  //   type: 'json', // or 'xml'
  //   getUrl: (query) => `https://api.distributor-c.com/search?q=${encodeURIComponent(query)}`,
  //   headers: { /* optional headers */ },
  //   map: (response) => {
  //     // Transform response to standard format
  //     return transformedData;
  //   }
  // }
];

/**
 * Search endpoint that queries all distributors in parallel
 */
app.get('/search', async (req, res) => {
  const query = req.query.q;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Create promises for all distributors
    const distributorPromises = distributors.map(async (distributor) => {
      try {
        // Handle both sync and async getUrl functions
        const url = typeof distributor.getUrl === 'function' && distributor.getUrl.constructor.name === 'AsyncFunction'
          ? await distributor.getUrl(query)
          : distributor.getUrl(query);
        
        // Handle both sync and async headers
        const headers = typeof distributor.headers === 'function' && distributor.headers.constructor.name === 'AsyncFunction'
          ? await distributor.headers()
          : distributor.headers;
        
        // Use custom request method if available, otherwise use default GET
        const response = distributor.makeRequest 
          ? await distributor.makeRequest(url, headers, query)
          : await axios.get(url, { 
              headers: headers,
              timeout: 10000 // 10 second timeout
            });
        
        // Transform the response using the distributor's map function
        const mappedResults = distributor.map(response);
        return {
          distributor: distributor.name,
          success: true,
          results: mappedResults
        };
      } catch (error) {
        console.error(`Error fetching from ${distributor.name}:`, error.message);
        return {
          distributor: distributor.name,
          success: false,
          error: error.message,
          results: []
        };
      }
    });

    // Wait for all distributors to complete (success or failure)
    const results = await Promise.allSettled(distributorPromises);
    
    // Flatten all successful results into a single array
    const allResults = [];
    const errors = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const distributorResult = result.value;
        if (distributorResult.success) {
          allResults.push(...distributorResult.results);
        } else {
          errors.push(`${distributorResult.distributor}: ${distributorResult.error}`);
        }
      } else {
        errors.push(`${distributors[index].name}: ${result.reason.message}`);
      }
    });

    res.json({
      query,
      totalResults: allResults.length,
      results: allResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Xero API integration
let xeroAccessToken = null;
let xeroRefreshToken = null;

// Xero OAuth2 configuration
const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_API_URL = 'https://api.xero.com';

// Function to get Xero access token
const getXeroAccessToken = async () => {
  if (xeroAccessToken) {
    return xeroAccessToken;
  }
  
  // For demo purposes, we'll use a mock token
  // In production, you'd implement OAuth2 flow
  console.log('⚠️ Using mock Xero token - implement OAuth2 flow for production');
  xeroAccessToken = 'mock_xero_token_' + Date.now();
  return xeroAccessToken;
};

// Xero OAuth2 authorization endpoint
app.get('/xero/auth', (req, res) => {
  const authUrl = `${XERO_AUTH_URL}?` + new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID,
    redirect_uri: process.env.XERO_REDIRECT_URI,
    scope: process.env.XERO_SCOPE,
    state: 'random_state_string' // In production, use a secure random string
  });
  
  res.redirect(authUrl);
});

// Xero OAuth2 callback endpoint
app.get('/xero/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code not provided');
    }
    
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(XERO_TOKEN_URL, {
      grant_type: 'authorization_code',
      client_id: process.env.XERO_CLIENT_ID,
      client_secret: process.env.XERO_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.XERO_REDIRECT_URI
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    xeroAccessToken = tokenResponse.data.access_token;
    xeroRefreshToken = tokenResponse.data.refresh_token;
    
    res.send(`
      <html>
        <body>
          <h2>✅ Xero Connected Successfully!</h2>
          <p>You can now create quotes in Xero.</p>
          <a href="/">← Back to Search</a>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Xero OAuth error:', error.response?.data || error.message);
    res.status(500).send('Error connecting to Xero');
  }
});

// Upload Tarsus XML file
app.post('/upload-tarsus-xml', upload.single('xmlFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No XML file uploaded' });
    }

    console.log('✅ Tarsus XML file uploaded successfully');
    res.json({
      success: true,
      message: 'Tarsus XML file uploaded successfully',
      filename: req.file.filename,
      size: req.file.size
    });

  } catch (error) {
    console.error('Error uploading Tarsus XML:', error);
    res.status(500).json({ error: 'Failed to upload XML file' });
  }
});

// Get Tarsus XML file status
app.get('/tarsus-status', (req, res) => {
  try {
    const xmlFilePath = path.join(uploadsDir, 'tarsus-products.xml');
    const exists = fs.existsSync(xmlFilePath);
    
    if (exists) {
      const stats = fs.statSync(xmlFilePath);
      res.json({
        success: true,
        uploaded: true,
        filename: 'tarsus-products.xml',
        size: stats.size,
        lastModified: stats.mtime
      });
    } else {
      res.json({
        success: true,
        uploaded: false,
        message: 'No Tarsus XML file uploaded yet'
      });
    }

  } catch (error) {
    console.error('Error checking Tarsus XML status:', error);
    res.status(500).json({ error: 'Failed to check XML file status' });
  }
});

// Get customers from Xero
app.get('/xero/customers', async (req, res) => {
  try {
    const token = await getXeroAccessToken();
    
    // For demo purposes, return mock customers
    // In production, you'd make the actual API call to Xero
    const mockCustomers = [
      {
        ContactID: 'customer-1',
        Name: 'ABC Company Ltd',
        EmailAddress: 'contact@abccompany.com',
        IsCustomer: true
      },
      {
        ContactID: 'customer-2', 
        Name: 'XYZ Corporation',
        EmailAddress: 'info@xyzcorp.com',
        IsCustomer: true
      },
      {
        ContactID: 'customer-3',
        Name: 'Tech Solutions Inc',
        EmailAddress: 'sales@techsolutions.com',
        IsCustomer: true
      }
    ];
    
    res.json({
      success: true,
      customers: mockCustomers
    });

  } catch (error) {
    console.error('Error fetching Xero customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers from Xero' });
  }
});

// Create quote in Xero
app.post('/create-quote', async (req, res) => {
  try {
    const { items, customer } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    if (!customer) {
      return res.status(400).json({ error: 'No customer provided' });
    }

    const token = await getXeroAccessToken();
    
    // Create quote data for Xero
    const quoteData = {
      Type: 'ACCRECQUOTE',
      Contact: {
        ContactID: customer.ContactID,
        Name: customer.Name,
        EmailAddress: customer.EmailAddress
      },
      Date: new Date().toISOString().split('T')[0],
      DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      LineItems: items.map(item => ({
        Description: item.description || item.sku,
        Quantity: 1,
        UnitAmount: parseFloat(item.price.replace('R', '').replace(',', '')),
        AccountCode: '200', // Sales account code - adjust as needed
        ItemCode: item.sku,
        TaxType: 'OUTPUT'
      })),
      Status: 'DRAFT'
    };

    // For demo purposes, return a mock response with Xero-style quote number
    // In production, you'd make the actual API call to Xero
    console.log('📋 Creating quote in Xero for customer:', customer.Name);
    console.log('📋 Items:', items.length);
    
    // Generate Xero-style quote number (QU-YYYY-NNNNNN format)
    const year = new Date().getFullYear();
    const quoteNumber = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    const xeroQuoteNumber = `QU-${year}-${quoteNumber}`;
    
    const mockQuoteId = 'QUOTE-' + Date.now();
    const mockQuoteUrl = `https://go.xero.com/organisationlogin/default.aspx?shortcode=${mockQuoteId}`;
    
    res.json({
      success: true,
      quoteId: mockQuoteId,
      quoteNumber: xeroQuoteNumber,
      quoteUrl: mockQuoteUrl,
      customer: customer.Name,
      message: 'Quote created successfully in Xero'
    });

  } catch (error) {
    console.error('Error creating Xero quote:', error);
    res.status(500).json({ error: 'Failed to create quote in Xero' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Configured ${distributors.length} distributors`);
});
