-- Database schema for distributor search system

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user', -- 'admin' or 'user'
    oauth_provider VARCHAR(50), -- 'microsoft', 'google', etc.
    oauth_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'rest_api', 'xml_feed', 'csv_upload'
    api_endpoint TEXT,
    xml_feed_url TEXT,
    auth_type VARCHAR(50), -- 'none', 'basic', 'bearer', 'oauth2'
    credentials JSONB, -- Encrypted credentials
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'error'
    last_sync_at TIMESTAMP,
    sync_interval_hours INTEGER DEFAULT 4,
    cache_ttl_hours INTEGER DEFAULT 24,
    logo_url TEXT,
    website_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category VARCHAR(255),
    brand VARCHAR(255),
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'ZAR',
    stock_quantity INTEGER DEFAULT 0,
    stock_status VARCHAR(50), -- 'in_stock', 'out_of_stock', 'low_stock'
    eta_days INTEGER,
    image_url TEXT,
    product_url TEXT,
    specs JSONB, -- Flexible product specifications
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sku, supplier_id)
);

-- Product search index (for fuzzy search)
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, '') || ' ' || sku));
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_status);

-- Price history table (for price tracking)
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ZAR',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(recorded_at);

-- Stock history table
CREATE TABLE IF NOT EXISTS stock_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_history_product ON stock_history(product_id);

-- Sync logs table
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'partial'
    products_synced INTEGER DEFAULT 0,
    errors TEXT,
    duration_ms INTEGER,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_supplier ON sync_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON sync_logs(started_at);

-- User preferences (for filters, favorites, etc.)
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts/Notifications table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'price_drop', 'back_in_stock', 'low_stock'
    threshold_value DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'triggered', 'dismissed'
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

-- Sessions table (for authentication)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

