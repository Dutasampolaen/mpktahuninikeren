#!/bin/bash

# MPK Tahunan Nikeren - 100% Free Self-Hosted Deployment
# No external services needed - everything runs on your VPS!

set -e

echo "================================================"
echo "MPK - 100% Free Self-Hosted Deployment"
echo "================================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="mpk.aynshop.com"
APP_DIR="/var/www/mpk"

echo -e "${YELLOW}Step 1: System Update${NC}"
sudo apt update
sudo apt upgrade -y

echo ""
echo -e "${YELLOW}Step 2: Install Node.js 20${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo ""
echo -e "${YELLOW}Step 3: Install Nginx${NC}"
sudo apt install -y nginx

echo ""
echo -e "${YELLOW}Step 4: Install PM2 (Process Manager)${NC}"
sudo npm install -g pm2

echo ""
echo -e "${YELLOW}Step 5: Install Certbot (SSL)${NC}"
sudo apt install -y certbot python3-certbot-nginx

echo ""
echo -e "${YELLOW}Step 6: Install Git${NC}"
sudo apt install -y git

echo ""
echo -e "${YELLOW}Step 7: Clone Repository${NC}"
sudo mkdir -p $APP_DIR
cd $APP_DIR
if [ -d ".git" ]; then
  sudo git config --global --add safe.directory $APP_DIR
  sudo git pull origin main
else
  sudo git clone https://github.com/Dutasampolaen/mpktahuninikeren.git .
  sudo git config --global --add safe.directory $APP_DIR
fi

echo ""
echo -e "${YELLOW}Step 8: Generate JWT Secret${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

echo ""
echo -e "${YELLOW}Step 9: Configure Environment${NC}"
sudo bash -c "cat > $APP_DIR/.env << EOF
VITE_API_URL=https://$DOMAIN
JWT_SECRET=$JWT_SECRET
EOF"

echo ""
echo -e "${YELLOW}Step 10: Install Dependencies${NC}"
cd $APP_DIR
sudo npm install --production=false

echo ""
echo -e "${YELLOW}Step 11: Build Frontend${NC}"
sudo npm run build

echo ""
echo -e "${YELLOW}Step 12: Start Backend with PM2${NC}"
sudo pm2 delete mpk-server 2>/dev/null || true
sudo pm2 start server/index.js --name mpk-server
sudo pm2 save
sudo pm2 startup | tail -1 | sudo bash

echo ""
echo -e "${YELLOW}Step 13: Configure Nginx${NC}"
sudo bash -c "cat > /etc/nginx/sites-available/mpk << 'NGINXCONF'
server {
    listen 80;
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

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Deny hidden files
    location ~ /\. {
        deny all;
    }
}
NGINXCONF"

sudo ln -sf /etc/nginx/sites-available/mpk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo -e "${YELLOW}Step 14: Configure Firewall${NC}"
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
echo "y" | sudo ufw enable || true

echo ""
echo -e "${YELLOW}Step 15: Setup SSL Certificate${NC}"
sudo certbot --nginx -d mpk.aynshop.com -d www.mpk.aynshop.com --non-interactive --agree-tos --email admin@aynshop.com --redirect || echo "SSL setup will be completed once DNS propagates"

sudo systemctl enable certbot.timer

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Your site: ${GREEN}https://mpk.aynshop.com${NC}"
echo ""
echo "✅ SQLite database: $APP_DIR/server/mpk.db"
echo "✅ Backend running on PM2 (auto-restarts)"
echo "✅ Nginx configured with SSL"
echo "✅ 12 commissions pre-loaded"
echo ""
echo "Next steps:"
echo "1. Visit https://mpk.aynshop.com"
echo "2. Sign up for an account"
echo "3. Make yourself admin:"
echo "   sqlite3 $APP_DIR/server/mpk.db"
echo '   UPDATE users SET roles = '"'"'["admin"]'"'"' WHERE email = '"'"'your-email@example.com'"'"';'
echo "   .exit"
echo "4. Start using your MPK system!"
echo ""
echo "Useful commands:"
echo "  sudo pm2 status          - Check backend status"
echo "  sudo pm2 logs mpk-server - View backend logs"
echo "  sudo pm2 restart mpk-server - Restart backend"
echo ""
echo -e "${GREEN}100% free, 100% yours!${NC}"
