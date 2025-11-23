#!/bin/bash

set -e

APP_DIR="/var/www/mpk"

echo "🔄 Updating MPK System from GitHub..."
echo ""

cd $APP_DIR

echo "📥 Pulling latest changes..."
sudo git pull origin main

echo ""
echo "📦 Installing dependencies..."
sudo npm install --production=false

echo ""
echo "🏗️  Building frontend..."
sudo npm run build

echo ""
echo "🔄 Restarting backend..."
sudo pm2 restart mpk-server

echo ""
echo "✅ Update complete!"
echo "🌐 Your site is now running the latest version"
