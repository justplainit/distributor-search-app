# Distributor Search - Product Comparison System

A full-stack web application for searching and comparing products from multiple suppliers in one unified interface.

## Features

- **Centralized Product Search**: Search by SKU, model name, or description with fuzzy search
- **Multi-Supplier Integration**: Support for REST APIs, XML feeds, and manual uploads
- **Modular Connector System**: Easy to add new suppliers via admin interface
- **Pricing & Stock Dashboard**: Unified table showing all product information
- **Smart Comparison**: Compare prices across suppliers for the same SKU
- **Real-time Updates**: Background sync with configurable intervals
- **Authentication**: Email/password login with admin and user roles
- **Caching**: Automatic caching with timestamps to minimize API calls
- **Notifications**: Email/Teams alerts for stock and price changes (coming soon)

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Sync**: Background cron jobs

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- (Optional) Redis for advanced caching

## Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up PostgreSQL database**:
```bash
createdb distributor_search
```

3. **Configure environment variables**:
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

4. **Run database migrations**:
```bash
npm run db:migrate
```

5. **Start the development servers**:

Terminal 1 - API Server:
```bash
npm run dev:server
```

Terminal 2 - Next.js Frontend:
```bash
npm run dev
```

## Default Login

- **Email**: admin@distributor-search.local
- **Password**: admin123

⚠️ **Change this immediately in production!**

## Project Structure

```
distributor-search-local/
├── app/                    # Next.js app directory
│   ├── page.js            # Main search page
│   ├── login/             # Login page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── SearchBar.js      # Search input
│   ├── ProductTable.js    # Product results table
│   └── Filters.js         # Filter sidebar
├── database/              # Database files
│   ├── schema.sql        # Database schema
│   ├── connection.js     # DB connection
│   └── migrate.js        # Migration script
├── connectors/            # Supplier connectors
│   ├── BaseConnector.js  # Base connector class
│   ├── MustekConnector.js # Mustek integration
│   └── index.js          # Connector registry
├── scripts/              # Utility scripts
│   └── sync-suppliers.js # Background sync service
├── server.js              # Express API server
└── package.json          # Dependencies
```

## Adding a New Supplier

1. **Via Admin Interface** (recommended):
   - Log in as admin
   - Go to Admin → Suppliers
   - Add supplier with API credentials or XML feed URL

2. **Via Code**:
   - Create a new connector in `connectors/` extending `BaseConnector`
   - Register it in `connectors/index.js`
   - Add supplier to database with appropriate credentials

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login

### Products
- `GET /api/products/search` - Search products (query params: q, supplier, category, minPrice, maxPrice, stockStatus)
- `GET /api/products/:id` - Get product details
- `GET /api/products/compare/:sku` - Compare product across suppliers

### Suppliers (Admin only)
- `GET /api/suppliers` - List all suppliers
- `POST /api/suppliers` - Create new supplier
- `POST /api/suppliers/:id/sync` - Trigger manual sync

## Background Sync

The system automatically syncs product data from all active suppliers. Configure sync intervals per supplier in the admin interface.

Run manual sync:
```bash
npm run sync
```

## Development

- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:3001

## Production Deployment

1. Build the Next.js app:
```bash
npm run build
```

2. Start production servers:
```bash
npm start          # Next.js
npm run server     # API server
```

3. Set up cron job for background sync:
```bash
# Add to crontab: runs every 4 hours
0 */4 * * * cd /path/to/app && npm run sync
```

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `API_PORT` - API server port (default: 3001)
- `NEXT_PUBLIC_API_URL` - API URL for frontend
- Supplier API keys (MUSTEK_API_TOKEN, etc.)

## Contributing

1. Create a branch for your feature
2. Implement connector or feature
3. Test thoroughly
4. Submit pull request

## License

MIT

