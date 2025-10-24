# Distributor Search App

A Node.js + Express web application that searches for models and SKUs across multiple distributors' APIs.

## Features

- 🔍 Search across multiple distributors in parallel
- 📊 Unified results display
- 🔧 Easy to add new distributors
- 🎨 Modern, responsive UI
- ⚡ Fast parallel API calls
- 🛡️ Error handling and timeout protection

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API keys:**
   Edit the `.env` file and add your distributor API keys:
   ```
   DISTRIBUTOR_A_BEARER_TOKEN=your_bearer_token_here
   DISTRIBUTOR_B_API_KEY=your_api_key_here
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Adding New Distributors

To add a new distributor, edit the `distributors` array in `server.js`:

```javascript
{
  name: 'Your Distributor',
  type: 'json', // or 'xml'
  getUrl: (query) => `https://api.your-distributor.com/search?q=${encodeURIComponent(query)}`,
  headers: {
    'Authorization': `Bearer ${process.env.YOUR_API_KEY}`,
    'Content-Type': 'application/json'
  },
  map: (response) => {
    // Transform the response to our standard format:
    // { distributor: string, sku: string, price: string, stock: string }
    return response.data.products.map(product => ({
      distributor: 'Your Distributor',
      sku: product.sku,
      price: `$${product.price}`,
      stock: product.stock
    }));
  }
}
```

## API Endpoints

- `GET /search?q={modelOrSku}` - Search for a model or SKU across all distributors

## Project Structure

```
├── server.js          # Main Express server
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
├── public/
│   ├── index.html    # Frontend HTML
│   └── style.css     # CSS styling
└── README.md         # This file
```

## Technologies Used

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Axios** - HTTP client for API calls
- **fast-xml-parser** - XML parsing
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
