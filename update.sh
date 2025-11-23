#!/bin/bash

# MPK Tahunan Nikeren - Update Script
# Run this to deploy updates after pushing to GitHub

set -e

APP_DIR="/var/www/mpk"
USER="www-data"

echo "================================================"
echo "MPK - Deploying Updates"
echo "================================================"

cd $APP_DIR

echo "Pulling latest changes..."
sudo -u $USER git pull origin main

echo "Installing dependencies..."
sudo -u $USER npm install

echo "Building application..."
sudo -u $USER npm run build

echo "Restarting nginx..."
sudo systemctl restart nginx

echo ""
echo "✅ Update deployed successfully!"
echo "Visit: https://mpk.aynshop.com"
