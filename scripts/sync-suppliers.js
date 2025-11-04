/**
 * Background sync service for suppliers
 * Syncs product data from all active suppliers
 */
const { query } = require('../database/connection');
const { getConnector } = require('../connectors');

async function syncSupplier(supplier) {
  const startTime = Date.now();
  let syncLogId = null;

  try {
    console.log(`🔄 Syncing supplier: ${supplier.name}`);

    // Create sync log
    const logResult = await query(
      'INSERT INTO sync_logs (supplier_id, status, started_at) VALUES ($1, $2, NOW()) RETURNING id',
      [supplier.id, 'in_progress']
    );
    syncLogId = logResult.rows[0].id;

    // Get connector
    const connector = getConnector(supplier);
    
    // Fetch products
    const products = await connector.fetchProducts();
    
    let syncedCount = 0;
    let errors = [];

    // Upsert products
    for (const product of products) {
      try {
        const normalized = connector.normalizeProduct(product);
        
        await query(
          `INSERT INTO products (
            sku, name, description, category, brand, supplier_id,
            price, currency, stock_quantity, stock_status, eta_days,
            image_url, product_url, specs, last_updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          ON CONFLICT (sku, supplier_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            stock_quantity = EXCLUDED.stock_quantity,
            stock_status = EXCLUDED.stock_status,
            last_updated = NOW()`,
          [
            normalized.sku,
            normalized.name,
            normalized.description,
            normalized.category,
            normalized.brand,
            supplier.id,
            normalized.price,
            normalized.currency,
            normalized.stock_quantity,
            normalized.stock_status,
            normalized.eta_days,
            normalized.image_url,
            normalized.product_url,
            JSON.stringify(normalized.specs),
          ]
        );

        // Record price history if price changed
        const existing = await query(
          'SELECT price FROM products WHERE sku = $1 AND supplier_id = $2',
          [normalized.sku, supplier.id]
        );
        
        if (existing.rows.length > 0 && existing.rows[0].price !== normalized.price) {
          const productResult = await query(
            'SELECT id FROM products WHERE sku = $1 AND supplier_id = $2',
            [normalized.sku, supplier.id]
          );
          if (productResult.rows.length > 0) {
            await query(
              'INSERT INTO price_history (product_id, price, currency) VALUES ($1, $2, $3)',
              [productResult.rows[0].id, normalized.price, normalized.currency]
            );
          }
        }

        syncedCount++;
      } catch (error) {
        errors.push(`SKU ${product.sku}: ${error.message}`);
      }
    }

    // Update supplier last_sync_at
    await query('UPDATE suppliers SET last_sync_at = NOW() WHERE id = $1', [supplier.id]);

    // Update sync log
    const duration = Date.now() - startTime;
    await query(
      'UPDATE sync_logs SET status = $1, products_synced = $2, errors = $3, completed_at = NOW(), duration_ms = $4 WHERE id = $5',
      ['success', syncedCount, errors.join('; '), duration, syncLogId]
    );

    console.log(`✅ Synced ${syncedCount} products from ${supplier.name}`);
  } catch (error) {
    console.error(`❌ Sync failed for ${supplier.name}:`, error);
    
    if (syncLogId) {
      await query(
        'UPDATE sync_logs SET status = $1, errors = $2, completed_at = NOW() WHERE id = $3',
        ['error', error.message, syncLogId]
      );
    }
  }
}

async function syncAllSuppliers() {
  try {
    const suppliers = await query("SELECT * FROM suppliers WHERE status = 'active'");
    
    console.log(`🔄 Starting sync for ${suppliers.rows.length} suppliers`);
    
    for (const supplier of suppliers.rows) {
      await syncSupplier(supplier);
    }
    
    console.log('✅ All suppliers synced');
  } catch (error) {
    console.error('❌ Sync all failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  syncAllSuppliers().then(() => process.exit(0));
}

module.exports = { syncSupplier, syncAllSuppliers };

