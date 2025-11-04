/**
 * Setup cron job for background supplier sync
 * Run this once to set up automatic syncing
 */
const cron = require('node-cron');
const { syncAllSuppliers } = require('./sync-suppliers');

// Sync every 4 hours
const syncJob = cron.schedule('0 */4 * * *', () => {
  console.log('🔄 Running scheduled supplier sync...');
  syncAllSuppliers();
}, {
  scheduled: false,
});

// Start the cron job
syncJob.start();
console.log('✅ Background sync cron job started (runs every 4 hours)');

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping cron job...');
  syncJob.stop();
  process.exit(0);
});

