#!/bin/bash

# Upload script for DigitalOcean Droplet
# Usage: ./upload-to-droplet.sh YOUR_DROPLET_IP

if [ -z "$1" ]; then
    echo "Usage: ./upload-to-droplet.sh YOUR_DROPLET_IP"
    echo "Example: ./upload-to-droplet.sh 123.456.789.012"
    exit 1
fi

DROPLET_IP=$1

echo "🚀 Uploading distributor search app to droplet $DROPLET_IP..."

# Create app directory on droplet
ssh root@$DROPLET_IP "mkdir -p /var/www/distributor-search"

# Upload all files
echo "📁 Uploading files..."
scp -r ./* root@$DROPLET_IP:/var/www/distributor-search/

echo "✅ Upload complete!"
echo ""
echo "Next steps:"
echo "1. SSH into your droplet: ssh root@$DROPLET_IP"
echo "2. Run the setup script: cd /var/www/distributor-search && chmod +x setup.sh && ./setup.sh"
