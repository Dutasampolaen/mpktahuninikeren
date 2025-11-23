#!/bin/bash

# MPK Tahunan Nikeren - Automated VPS Deployment Script
# For Ubuntu 20.04/22.04 LTS
# Domain: mpk.aynshop.com

set -e

echo "================================================"
echo "MPK Tahunan Nikeren - VPS Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="mpk.aynshop.com"
APP_DIR="/var/www/mpk"
USER="www-data"

echo -e "${YELLOW}Step 1: System Update${NC}"
sudo apt update
sudo apt upgrade -y

echo ""
echo -e "${YELLOW}Step 2: Install Dependencies${NC}"
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install git
sudo apt install -y git

echo ""
echo -e "${YELLOW}Step 3: Clone Repository${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Clone as current user, then move
git clone https://github.com/Dutasampolaen/mpktahuninikeren.git /tmp/mpk-temp
sudo mv /tmp/mpk-temp/* $APP_DIR/
sudo mv /tmp/mpk-temp/.* $APP_DIR/ 2>/dev/null || true
sudo rm -rf /tmp/mpk-temp
sudo chown -R $USER:$USER $APP_DIR

echo ""
echo -e "${YELLOW}Step 4: Configure Environment${NC}"
echo "Please enter your Supabase URL:"
read SUPABASE_URL
echo "Please enter your Supabase Anon Key:"
read SUPABASE_ANON_KEY

sudo bash -c "cat > $APP_DIR/.env << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF"

echo ""
echo -e "${YELLOW}Step 5: Install Dependencies and Build${NC}"
cd $APP_DIR
sudo -u $USER npm install
sudo -u $USER npm run build

echo ""
echo -e "${YELLOW}Step 6: Configure Nginx${NC}"
sudo bash -c "cat > /etc/nginx/sites-available/mpk << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name mpk.aynshop.com www.mpk.aynshop.com;

    root /var/www/mpk/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOF"

# Enable site
sudo ln -sf /etc/nginx/sites-available/mpk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo -e "${YELLOW}Step 7: Configure Firewall${NC}"
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
echo "y" | sudo ufw enable

echo ""
echo -e "${YELLOW}Step 8: Setup SSL Certificate${NC}"
echo "Setting up SSL certificate for $DOMAIN..."
sudo certbot --nginx -d mpk.aynshop.com -d www.mpk.aynshop.com --non-interactive --agree-tos --email admin@aynshop.com --redirect

# Auto-renewal
sudo systemctl enable certbot.timer

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Your site is now live at: ${GREEN}https://mpk.aynshop.com${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://mpk.aynshop.com"
echo "2. Sign up for an account"
echo "3. Run this SQL in Supabase to make yourself admin:"
echo "   UPDATE users SET roles = '[\"admin\"]'::jsonb WHERE email = 'your-email@example.com';"
echo "4. Import your members using bulk import"
echo ""
echo "Site location: $APP_DIR"
echo "Nginx config: /etc/nginx/sites-available/mpk"
echo "SSL cert renews automatically"
echo ""
echo -e "${GREEN}Enjoy your MPK Management System!${NC}"
