# VPS Setup Guide - Ubuntu Server

## Quick Setup (Automated)

### Prerequisites
- Ubuntu 20.04 or 22.04 LTS VPS
- Root or sudo access
- Domain `mpk.aynshop.com` pointed to your VPS IP

### DNS Configuration (Do This First!)

Point your domain to your VPS:

**At your DNS provider (where you bought aynshop.com):**

```
Type: A
Name: mpk
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600
```

Wait 5-10 minutes for DNS propagation.

### One-Command Installation

SSH into your VPS and run:

```bash
# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/Dutasampolaen/mpktahuninikeren/main/deploy.sh | bash
```

**OR** if you prefer to review the script first:

```bash
# Clone the repository first
git clone https://github.com/Dutasampolaen/mpktahuninikeren.git
cd mpktahuninikeren

# Make script executable
chmod +x deploy.sh

# Run it
sudo ./deploy.sh
```

### What the Script Does

1. ✅ Updates system packages
2. ✅ Installs Node.js 20.x
3. ✅ Installs Nginx web server
4. ✅ Installs SSL certificate (Let's Encrypt)
5. ✅ Clones your repository
6. ✅ Asks for Supabase credentials
7. ✅ Builds the application
8. ✅ Configures Nginx
9. ✅ Sets up firewall
10. ✅ Enables SSL with auto-renewal

**Total time: ~5 minutes**

## Manual Setup (Step by Step)

If you prefer manual control:

### Step 1: Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### Step 2: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 3: Install Nginx
```bash
sudo apt install -y nginx
```

### Step 4: Install Certbot (for SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Step 5: Clone Repository
```bash
sudo mkdir -p /var/www/mpk
cd /var/www/mpk
sudo git clone https://github.com/Dutasampolaen/mpktahuninikeren.git .
```

### Step 6: Configure Environment
```bash
sudo nano /var/www/mpk/.env
```

Add:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 7: Build Application
```bash
cd /var/www/mpk
sudo npm install
sudo npm run build
```

### Step 8: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/mpk
```

Paste:
```nginx
server {
    listen 80;
    server_name mpk.aynshop.com www.mpk.aynshop.com;

    root /var/www/mpk/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mpk /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 9: Setup SSL
```bash
sudo certbot --nginx -d mpk.aynshop.com -d www.mpk.aynshop.com
```

Follow prompts, choose redirect (option 2).

### Step 10: Configure Firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Updating Your Site

After pushing changes to GitHub:

```bash
cd /var/www/mpk
sudo git pull
sudo npm install
sudo npm run build
sudo systemctl restart nginx
```

**OR** use the update script:
```bash
cd /var/www/mpk
sudo ./update.sh
```

## Useful Commands

### Check if site is running
```bash
sudo systemctl status nginx
curl -I https://mpk.aynshop.com
```

### View logs
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Restart services
```bash
sudo systemctl restart nginx
```

### Check SSL certificate
```bash
sudo certbot certificates
```

### Renew SSL manually (auto-renews automatically)
```bash
sudo certbot renew
```

## Troubleshooting

### Site not accessible
```bash
# Check nginx is running
sudo systemctl status nginx

# Check firewall
sudo ufw status

# Test nginx config
sudo nginx -t
```

### SSL issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal
```

### Build fails
```bash
# Check Node.js version (should be 18+)
node --version

# Clean and rebuild
cd /var/www/mpk
sudo rm -rf node_modules
sudo npm install
sudo npm run build
```

### DNS not resolving
```bash
# Check DNS propagation
nslookup mpk.aynshop.com
dig mpk.aynshop.com

# Wait 10-30 minutes for DNS to propagate
```

## Performance Optimization

### Enable Nginx caching
Add to nginx config:
```nginx
# In http block of /etc/nginx/nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m inactive=60m;
proxy_cache_key "$scheme$request_method$host$request_uri";
```

### Enable HTTP/2
Add to server block:
```nginx
listen 443 ssl http2;
```

### Setup log rotation
Already handled by Ubuntu, but verify:
```bash
ls -la /etc/logrotate.d/nginx
```

## Security Checklist

- [x] Firewall enabled (ufw)
- [x] SSL certificate active (HTTPS)
- [x] SSH key authentication recommended
- [x] Regular updates scheduled
- [x] Nginx security headers configured
- [x] .env file secured (not in git)

## Backup Strategy

### Manual backup
```bash
# Backup site files
sudo tar -czf ~/mpk-backup-$(date +%Y%m%d).tar.gz /var/www/mpk

# Download to local machine
scp user@your-vps-ip:~/mpk-backup-*.tar.gz .
```

### Automated daily backup
```bash
# Create backup script
sudo nano /usr/local/bin/backup-mpk.sh
```

Paste:
```bash
#!/bin/bash
tar -czf /root/backups/mpk-$(date +%Y%m%d).tar.gz /var/www/mpk
find /root/backups -name "mpk-*" -mtime +7 -delete
```

Make executable and schedule:
```bash
sudo chmod +x /usr/local/bin/backup-mpk.sh
sudo mkdir -p /root/backups
(sudo crontab -l ; echo "0 2 * * * /usr/local/bin/backup-mpk.sh") | sudo crontab -
```

## Monitoring

### Setup monitoring (optional)
```bash
# Install htop for system monitoring
sudo apt install -y htop

# Install nginx monitoring
sudo apt install -y goaccess
```

### Check disk space
```bash
df -h
```

### Check memory usage
```bash
free -h
```

## Support

For issues:
1. Check nginx logs: `/var/log/nginx/error.log`
2. Check build output: `npm run build`
3. Test locally first
4. Verify DNS settings
5. Check firewall rules

## Production Checklist

Before going live:
- [ ] DNS configured and propagated
- [ ] SSL certificate active (HTTPS)
- [ ] Firewall configured
- [ ] .env file secured
- [ ] Site accessible at https://mpk.aynshop.com
- [ ] Admin account created
- [ ] Members imported
- [ ] Backup strategy in place
- [ ] Monitoring setup (optional)

## Cost Estimate

**VPS Requirements:**
- CPU: 1-2 cores
- RAM: 2GB minimum
- Storage: 20GB SSD
- Bandwidth: 1TB

**Recommended Providers:**
- DigitalOcean: $12/month
- Vultr: $10/month
- Linode: $12/month
- Hetzner: $5/month (EU)

All include free bandwidth and backups.
