#!/bin/bash

echo "🚀 Setting up Distributor Search App on DigitalOcean Droplet..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install nginx -y

# Install Certbot for SSL
echo "📦 Installing Certbot..."
apt install certbot python3-certbot-nginx -y

# Install app dependencies
echo "📦 Installing app dependencies..."
cd /var/www/distributor-search
npm install

# Create production .env file
echo "⚙️ Creating production .env file..."
cat > .env << 'EOF'
PORT=3000
NODE_ENV=production

# Axiz API Configuration
AXIZ_CLIENT_ID=JUSTPLAINITPTYLTD_SJJUS999
AXIZ_CLIENT_SECRET=e946fe67-f288-4517-8a5f-82e6c0a16518
AXIZ_SCOPE=axiz-api.customers axiz-api.erppricelist axiz-api.internalpricelist axiz-api.markets axiz-api.salesordertracking
AXIZ_TOKEN_ENDPOINT=https://www.axizdigital.com/connect/token
AXIZ_API_BASE_URL=https://api.goaxiz.co.za

# Xero API Configuration (UPDATE THESE WITH YOUR REAL CREDENTIALS)
XERO_CLIENT_ID=your_xero_client_id_here
XERO_CLIENT_SECRET=your_xero_client_secret_here
XERO_TENANT_ID=your_xero_tenant_id_here
XERO_REDIRECT_URI=https://YOUR_DOMAIN.com/xero/callback
XERO_SCOPE=accounting.transactions accounting.settings
EOF

# Configure Nginx
echo "⚙️ Configuring Nginx..."
cat > /etc/nginx/sites-available/distributor-search << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/distributor-search /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx

# Start the app with PM2
echo "🚀 Starting the app..."
pm2 start server.js --name "distributor-search"
pm2 save
pm2 startup

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Your app is running at: http://$(curl -s ifconfig.me)"
echo ""
echo "📋 Next steps:"
echo "1. Get a domain name (optional) or use the IP address"
echo "2. Update Xero configuration with your domain/IP"
echo "3. Update the .env file with your real Xero credentials"
echo "4. Get SSL certificate: certbot --nginx -d YOUR_DOMAIN"
echo ""
echo "🔧 Useful commands:"
echo "- View logs: pm2 logs distributor-search"
echo "- Restart app: pm2 restart distributor-search"
echo "- Check status: pm2 status"
