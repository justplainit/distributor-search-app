/**
 * Express API Server for Distributor Search System
 * Handles all API endpoints for the Next.js frontend
 */
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const { query } = require('./database/connection');
const { getConnector } = require('./connectors');

const app = express();
const PORT = process.env.API_PORT || 3001;
const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), devMode: DEV_MODE });
});

// Development mode: In-memory data for testing
const devProducts = [];
const devSuppliers = [
  { id: 1, name: 'Mustek', slug: 'mustek', status: 'active' },
  { id: 2, name: 'Axiz', slug: 'axiz', status: 'active' },
  { id: 3, name: 'Tarsus', slug: 'tarsus', status: 'active' },
];

// Authentication middleware
const authenticate = async (req, res, next) => {
  // Skip auth in dev mode
  if (DEV_MODE) {
    req.user = { id: 1, email: 'dev@test.com', name: 'Dev User', role: 'admin' };
    return next();
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = await query('SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()', [token]);
    if (session.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await query('SELECT id, email, name, role FROM users WHERE id = $1', [session.rows[0].user_id]);
    req.user = user.rows[0];
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  // Dev mode: auto-login
  if (DEV_MODE) {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    return res.json({
      token,
      user: {
        id: 1,
        email: 'dev@test.com',
        name: 'Dev User',
        role: 'admin',
      },
    });
  }

  try {
    const { email, password } = req.body;
    
    const user = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    
    await query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.rows[0].id, token]
    );

    res.json({
      token,
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        name: user.rows[0].name,
        role: user.rows[0].role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

  // Dev mode: Load products from all suppliers
  if (DEV_MODE) {
    (async () => {
      try {
        console.log('🔄 Dev mode: Loading products from suppliers...');
        
        // Load Mustek products
        try {
          const MustekConnector = require('./connectors/MustekConnector');
          const mustekConfig = {
            name: 'Mustek',
            slug: 'mustek',
            type: 'rest_api',
            api_endpoint: 'https://api.mustek.co.za/Customer/ItemsStock.ashx',
            credentials: { token: 'b9ec44bc-3b40-46f2-bc6d-47bfa5e2c167' },
          };
          const mustekConnector = new MustekConnector(mustekConfig);
          const mustekProducts = await mustekConnector.fetchProducts();
          
          devProducts.push(...mustekProducts.map(p => ({
            ...p,
            supplier_id: 1,
            supplier_name: 'Mustek',
            supplier_slug: 'mustek',
            id: Math.random().toString(36).substr(2, 9),
          })));
          
          console.log(`✅ Dev mode: Loaded ${mustekProducts.length} Mustek products`);
        } catch (error) {
          console.error('⚠️ Dev mode: Could not load Mustek products:', error.message);
        }
        
        // Load Axiz products
        try {
          const AxizConnector = require('./connectors/AxizConnector');
          const axizConfig = {
            name: 'Axiz',
            slug: 'axiz',
            type: 'rest_api',
            api_endpoint: process.env.AXIZ_API_BASE_URL || 'https://api.goaxiz.co.za',
            credentials: {
              client_id: process.env.AXIZ_CLIENT_ID,
              client_secret: process.env.AXIZ_CLIENT_SECRET,
              token_endpoint: process.env.AXIZ_TOKEN_ENDPOINT || 'https://www.axizdigital.com/connect/token',
            },
          };
          const axizConnector = new AxizConnector(axizConfig);
          const axizProducts = await axizConnector.fetchProducts();
          
          devProducts.push(...axizProducts.map(p => ({
            ...p,
            supplier_id: 2,
            supplier_name: 'Axiz',
            supplier_slug: 'axiz',
            id: Math.random().toString(36).substr(2, 9),
          })));
          
          console.log(`✅ Dev mode: Loaded ${axizProducts.length} Axiz products`);
        } catch (error) {
          console.error('⚠️ Dev mode: Could not load Axiz products:', error.message);
        }
        
        // Load Tarsus products
        try {
          const TarsusConnector = require('./connectors/TarsusConnector');
          const tarsusConfig = {
            name: 'Tarsus',
            slug: 'tarsus',
            type: 'rest_api',
            api_endpoint: process.env.TARSUS_API_URL || 'https://feedgen.tarsusonline.co.za/api/DataFeed/Customer-ProductCatalogue',
            credentials: {
              token: process.env.TARSUS_API_TOKEN,
            },
          };
          const tarsusConnector = new TarsusConnector(tarsusConfig);
          const tarsusProducts = await tarsusConnector.fetchProducts();
          
          devProducts.push(...tarsusProducts.map(p => ({
            ...p,
            supplier_id: 3,
            supplier_name: 'Tarsus',
            supplier_slug: 'tarsus',
            id: Math.random().toString(36).substr(2, 9),
          })));
          
          console.log(`✅ Dev mode: Loaded ${tarsusProducts.length} Tarsus products`);
        } catch (error) {
          console.error('⚠️ Dev mode: Could not load Tarsus products:', error.message);
        }
        
        console.log(`✅ Dev mode: Total ${devProducts.length} products loaded`);
      } catch (error) {
        console.error('⚠️ Dev mode: Error loading products:', error.message);
      }
    })();
  }

// Search products
app.get('/api/products/search', authenticate, async (req, res) => {
  try {
    // Dev mode: Search in-memory
    if (DEV_MODE) {
      const { q, supplier, category, minPrice, maxPrice, stockStatus, limit = 100, offset = 0 } = req.query;
      
      let filtered = [...devProducts];
      
      if (q) {
        const queryLower = q.toLowerCase();
        filtered = filtered.filter(p => 
          p.sku?.toLowerCase().includes(queryLower) ||
          p.name?.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower) ||
          p.brand?.toLowerCase().includes(queryLower)
        );
      }
      
      if (supplier) {
        filtered = filtered.filter(p => p.supplier_slug === supplier);
      }
      
      if (stockStatus) {
        filtered = filtered.filter(p => {
          const status = p.stock_status || p.stockStatus;
          return status === stockStatus;
        });
      }
      
      if (minPrice) {
        const min = parseFloat(minPrice);
        if (!isNaN(min)) {
          filtered = filtered.filter(p => p.price && parseFloat(p.price) >= min);
        }
      }
      
      if (maxPrice) {
        const max = parseFloat(maxPrice);
        if (!isNaN(max)) {
          filtered = filtered.filter(p => p.price && parseFloat(p.price) <= max);
        }
      }
      
      const total = filtered.length;
      // Shuffle results to mix suppliers (or sort by supplier for better UX)
      // For now, just sort by supplier name to mix results
      filtered.sort((a, b) => {
        const supplierA = a.supplier_name || '';
        const supplierB = b.supplier_name || '';
        if (supplierA !== supplierB) {
          return supplierA.localeCompare(supplierB);
        }
        // Within same supplier, sort by name
        return (a.name || '').localeCompare(b.name || '');
      });
      const paginated = filtered.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
      
      return res.json({
        products: paginated,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }

    // Production mode: Query database
    const { q, supplier, category, minPrice, maxPrice, stockStatus, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT 
        p.*,
        s.name as supplier_name,
        s.slug as supplier_slug,
        s.logo_url as supplier_logo
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (q) {
      paramCount++;
      sql += ` AND (
        p.sku ILIKE $${paramCount} OR
        p.name ILIKE $${paramCount} OR
        p.description ILIKE $${paramCount} OR
        p.brand ILIKE $${paramCount}
      )`;
      params.push(`%${q}%`);
    }

    if (supplier) {
      paramCount++;
      sql += ` AND s.slug = $${paramCount}`;
      params.push(supplier);
    }

    if (category) {
      paramCount++;
      sql += ` AND p.category = $${paramCount}`;
      params.push(category);
    }

    if (minPrice) {
      paramCount++;
      sql += ` AND p.price >= $${paramCount}`;
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      paramCount++;
      sql += ` AND p.price <= $${paramCount}`;
      params.push(parseFloat(maxPrice));
    }

    if (stockStatus) {
      paramCount++;
      sql += ` AND p.stock_status = $${paramCount}`;
      params.push(stockStatus);
    }

    sql += ` ORDER BY p.last_updated DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Get total count
    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*/, '');
    const countResult = await query(countSql, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      products: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get product by SKU (for comparison)
app.get('/api/products/compare/:sku', authenticate, async (req, res) => {
  try {
    const { sku } = req.params;
    
    if (DEV_MODE) {
      const products = devProducts.filter(p => p.sku === sku);
      return res.json({ products });
    }
    
    const result = await query(
      `SELECT 
        p.*,
        s.name as supplier_name,
        s.slug as supplier_slug,
        s.logo_url as supplier_logo
       FROM products p
       JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.sku = $1
       ORDER BY p.price ASC`,
      [sku]
    );
    res.json({ products: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Comparison failed' });
  }
});

// Get product details
app.get('/api/products/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (DEV_MODE) {
      const product = devProducts.find(p => p.id === id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.json({ product });
    }
    
    const result = await query(
      `SELECT 
        p.*,
        s.name as supplier_name,
        s.slug as supplier_slug,
        s.logo_url as supplier_logo,
        s.website_url as supplier_website
       FROM products p
       JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Supplier management (admin only)
app.get('/api/suppliers', authenticate, async (req, res) => {
  try {
    if (DEV_MODE) {
      return res.json({ suppliers: devSuppliers });
    }
    
    const result = await query('SELECT * FROM suppliers ORDER BY name');
    res.json({ suppliers: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

app.post('/api/suppliers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, slug, type, api_endpoint, auth_type, credentials } = req.body;
    const result = await query(
      `INSERT INTO suppliers (name, slug, type, api_endpoint, auth_type, credentials)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, slug, type, api_endpoint, auth_type, JSON.stringify(credentials || {})]
    );
    res.json({ supplier: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// Sync suppliers
app.post('/api/suppliers/:id/sync', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (DEV_MODE) {
      return res.json({ message: 'Sync not available in dev mode', supplier_id: id });
    }
    
    const supplier = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (supplier.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Trigger sync in background
    const { syncSupplier } = require('./scripts/sync-suppliers');
    syncSupplier(supplier.rows[0]).catch(console.error);

    res.json({ message: 'Sync started', supplier_id: id });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  if (DEV_MODE) {
    console.log('⚠️  Running in DEV MODE (no database required)');
    console.log('   Products will be loaded from Mustek API on startup');
  }
});
