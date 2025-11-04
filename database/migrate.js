const fs = require('fs');
const path = require('path');
const { query } = require('./connection');

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await query(schema);
    
    console.log('✅ Database migrations completed');
    
    // Seed initial data if needed
    await seedInitialData();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function seedInitialData() {
  try {
    // Check if admin user exists
    const adminCheck = await query('SELECT id FROM users WHERE email = $1', ['admin@distributor-search.local']);
    
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      await query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        ['admin@distributor-search.local', passwordHash, 'Admin User', 'admin']
      );
      
      console.log('✅ Created default admin user (email: admin@distributor-search.local, password: admin123)');
    }
    
    // Seed existing suppliers from old system
    const suppliers = [
      {
        name: 'Mustek',
        slug: 'mustek',
        type: 'rest_api',
        api_endpoint: 'https://api.mustek.co.za/Customer/ItemsStock.ashx',
        auth_type: 'token',
        status: 'active',
      },
      {
        name: 'Axiz',
        slug: 'axiz',
        type: 'rest_api',
        auth_type: 'oauth2',
        status: 'inactive',
      },
      {
        name: 'Tarsus',
        slug: 'tarsus',
        type: 'xml_feed',
        status: 'inactive',
      },
    ];
    
    for (const supplier of suppliers) {
      const existing = await query('SELECT id FROM suppliers WHERE slug = $1', [supplier.slug]);
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO suppliers (name, slug, type, api_endpoint, auth_type, status) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [supplier.name, supplier.slug, supplier.type, supplier.api_endpoint, supplier.auth_type, supplier.status]
        );
        console.log(`✅ Seeded supplier: ${supplier.name}`);
      }
    }
    
  } catch (error) {
    console.error('⚠️ Seed data error:', error.message);
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0));
}

module.exports = { migrate, seedInitialData };

