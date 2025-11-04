import { NextResponse } from 'next/server';

// Mark as dynamic route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dev mode: In-memory data (will be loaded on first request)
let devProducts = [];
let devProductsLoaded = false;

const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;

// Load products from suppliers (dev mode)
async function loadDevProducts() {
  if (devProductsLoaded) return devProducts;
  
  devProducts = [];
  devProductsLoaded = true;

  try {
    // Load Mustek products
    try {
      const path = require('path');
      const MustekConnector = require(path.join(process.cwd(), 'connectors', 'MustekConnector'));
      const mustekConfig = {
        name: 'Mustek',
        slug: 'mustek',
        type: 'rest_api',
        api_endpoint: 'https://api.mustek.co.za/Customer/ItemsStock.ashx',
        credentials: { token: process.env.MUSTEK_API_TOKEN || 'b9ec44bc-3b40-46f2-bc6d-47bfa5e2c167' },
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
      
      console.log(`✅ Loaded ${mustekProducts.length} Mustek products`);
    } catch (error) {
      console.error('⚠️ Could not load Mustek products:', error.message);
    }
    
    // Load Axiz products
    try {
      const AxizConnector = require(path.join(process.cwd(), 'connectors', 'AxizConnector'));
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
      
      console.log(`✅ Loaded ${axizProducts.length} Axiz products`);
    } catch (error) {
      console.error('⚠️ Could not load Axiz products:', error.message);
    }
    
    // Load Tarsus products
    try {
      const TarsusConnector = require(path.join(process.cwd(), 'connectors', 'TarsusConnector'));
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
      
      console.log(`✅ Loaded ${tarsusProducts.length} Tarsus products`);
    } catch (error) {
      console.error('⚠️ Could not load Tarsus products:', error.message);
    }
    
    console.log(`✅ Total ${devProducts.length} products loaded`);
  } catch (error) {
    console.error('⚠️ Error loading products:', error.message);
    // If there's an error, mark as loaded to prevent infinite retries
    devProductsLoaded = true;
  }
  
  return devProducts;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const supplier = searchParams.get('supplier');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const stockStatus = searchParams.get('stockStatus');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Dev mode: Search in-memory (no authentication required)
    if (DEV_MODE) {
      // Load products if not already loaded
      if (!devProductsLoaded) {
        console.log('📦 Loading products from suppliers...');
        await loadDevProducts();
      }
      
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
      
      if (category) {
        filtered = filtered.filter(p => p.category?.toLowerCase() === category.toLowerCase());
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
      // Sort by supplier name to mix results
      filtered.sort((a, b) => {
        const supplierA = a.supplier_name || '';
        const supplierB = b.supplier_name || '';
        if (supplierA !== supplierB) {
          return supplierA.localeCompare(supplierB);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
      
      const paginated = filtered.slice(offset, offset + limit);
      
      return NextResponse.json({
        products: paginated,
        total,
        limit,
        offset,
      });
    }

    // Production mode: Query database
    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));
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
    let paramIndex = 1;

    if (q) {
      sql += ` AND (
        p.sku ILIKE $${paramIndex} OR
        p.name ILIKE $${paramIndex} OR
        p.description ILIKE $${paramIndex}
      )`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    if (supplier) {
      sql += ` AND s.slug = $${paramIndex}`;
      params.push(supplier);
      paramIndex++;
    }

    if (category) {
      sql += ` AND p.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (minPrice) {
      sql += ` AND p.price >= $${paramIndex}`;
      params.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      sql += ` AND p.price <= $${paramIndex}`;
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    if (stockStatus) {
      sql += ` AND p.stock_status = $${paramIndex}`;
      params.push(stockStatus);
      paramIndex++;
    }

    sql += ` ORDER BY s.name, p.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const totalResult = await query(
      sql.replace(/ORDER BY.*$/, '').replace(/LIMIT.*$/, ''),
      params.slice(0, -2)
    );

    return NextResponse.json({
      products: result.rows,
      total: totalResult.rows.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

