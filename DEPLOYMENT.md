# 🚀 Deployment Guide - DigitalOcean Droplet

## Step 1: Create DigitalOcean Droplet

1. **Go to**: https://digitalocean.com
2. **Create Account** (if needed)
3. **Create Droplet**:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic $6/month (1GB RAM, 1 CPU)
   - **Region**: Choose closest to you
   - **Authentication**: SSH Key (recommended) or Password

## Step 2: Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

## Step 3: Install Node.js and Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx
apt install nginx -y

# Install Certbot for SSL
apt install certbot python3-certbot-nginx -y
```

## Step 4: Deploy Your App

```bash
# Create app directory
mkdir -p /var/www/distributor-search
cd /var/www/distributor-search

# Upload your files (use SCP or Git)
# Option 1: Upload via SCP from your local machine
# scp -r /tmp/distributor-search-app/* root@YOUR_DROPLET_IP:/var/www/distributor-search/

# Option 2: Clone from Git (if you push to GitHub)
# git clone YOUR_GITHUB_REPO_URL .

# Install dependencies
npm install

# Create production .env file
nano .env
```

## Step 5: Configure Environment Variables

```bash
# Edit .env file
nano .env
```

Add your production values:
```env
PORT=3000
NODE_ENV=production

# Axiz API Configuration
AXIZ_CLIENT_ID=JUSTPLAINITPTYLTD_SJJUS999
AXIZ_CLIENT_SECRET=e946fe67-f288-4517-8a5f-82e6c0a16518
AXIZ_SCOPE=axiz-api.customers axiz-api.erppricelist axiz-api.internalpricelist axiz-api.markets axiz-api.salesordertracking
AXIZ_TOKEN_ENDPOINT=https://www.axizdigital.com/connect/token
AXIZ_API_BASE_URL=https://api.goaxiz.co.za

# Xero API Configuration (use your real credentials)
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_TENANT_ID=your_xero_tenant_id
XERO_REDIRECT_URI=https://YOUR_DOMAIN.com/xero/callback
XERO_SCOPE=accounting.transactions accounting.settings
```

## Step 6: Configure Nginx

```bash
# Create Nginx config
nano /etc/nginx/sites-available/distributor-search
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

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
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/distributor-search /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
```

## Step 7: Start Your App with PM2

```bash
# Start the app
pm2 start server.js --name "distributor-search"

# Save PM2 configuration
pm2 save
pm2 startup

# Check status
pm2 status
```

## Step 8: Setup SSL Certificate

```bash
# Get SSL certificate
certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com

# Test auto-renewal
certbot renew --dry-run
```

## Step 9: Update Xero Configuration

1. **Go to Xero Developer Portal**
2. **Update your app settings**:
   - **Company or Application URL**: `https://YOUR_DOMAIN.com`
   - **Redirect URI**: `https://YOUR_DOMAIN.com/xero/callback`

## Step 10: Test Your Deployment

1. **Visit**: `https://YOUR_DOMAIN.com`
2. **Test search functionality**
3. **Test Xero connection**
4. **Test quote creation**

## 🔧 Maintenance Commands

```bash
# View logs
pm2 logs distributor-search

# Restart app
pm2 restart distributor-search

# Update app
cd /var/www/distributor-search
git pull
npm install
pm2 restart distributor-search
```

## 💰 Cost Breakdown

- **DigitalOcean Droplet**: $6/month
- **Domain name**: $10-15/year (optional, can use IP)
- **Total**: ~$7-8/month

## 🎯 Benefits

- ✅ **HTTPS enabled** for Xero integration
- ✅ **Professional domain** (optional)
- ✅ **Auto-restart** on server reboot
- ✅ **SSL certificate** auto-renewal
- ✅ **Production ready**
