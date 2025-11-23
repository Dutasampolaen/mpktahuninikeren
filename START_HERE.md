# 🚀 START HERE - Ubuntu VPS Deployment

## Prerequisites

1. **Ubuntu VPS** (20.04 or 22.04 LTS)
   - Minimum: 2GB RAM, 1 CPU, 20GB storage
   - Root or sudo access

2. **Domain DNS** configured:
   - Type: `A`
   - Name: `mpk`
   - Value: `YOUR_VPS_IP`
   - At your domain provider (aynshop.com)

3. **Supabase** credentials ready:
   - Supabase URL
   - Supabase Anon Key

## 🎯 One-Command Deployment

SSH into your VPS and run:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Dutasampolaen/mpktahuninikeren/main/deploy.sh)
```

**That's it!** The script will:
- Install all dependencies
- Clone the repository
- Ask for your Supabase credentials
- Build the application
- Configure Nginx
- Setup SSL certificate
- Start the site

**Time required: ~5 minutes**

## ✅ What You'll Get

After running the script:

✅ Site live at: **https://mpk.aynshop.com**
✅ SSL certificate (auto-renewing)
✅ Firewall configured
✅ Nginx optimized
✅ Gzip compression enabled
✅ Security headers set

## 📋 Post-Deployment Steps

### 1. Create Admin Account
Visit https://mpk.aynshop.com and sign up

### 2. Make Yourself Admin
In Supabase SQL Editor, run:
```sql
UPDATE users
SET roles = '["admin"]'::jsonb
WHERE email = 'your-email@example.com';
```

### 3. Import Members
Login → Members → Bulk Import
```csv
name,nis,email,password,class,commission
John Doe,10001,john@school.com,pass123,10A,Sekbid 1
```

### 4. Start Using!
- Create programs
- Assign committees
- Track workload

## 🔄 Updating Your Site

After pushing changes to GitHub:

```bash
ssh root@YOUR_VPS_IP
cd /var/www/mpk
sudo ./update.sh
```

## 📚 Documentation

- **[COMMANDS.txt](COMMANDS.txt)** - Quick command reference
- **[VPS_SETUP.md](VPS_SETUP.md)** - Detailed setup guide
- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - Architecture overview
- **[README.md](README.md)** - Full feature documentation

## 🆘 Troubleshooting

### Site not loading?
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

### Can't login as admin?
Run the SQL command in step 2 above

### Build errors?
```bash
cd /var/www/mpk
sudo rm -rf node_modules
sudo npm install
sudo npm run build
```

### DNS not resolving?
Wait 10-30 minutes for DNS propagation

## 💡 Quick Tips

- Site files: `/var/www/mpk`
- Nginx config: `/etc/nginx/sites-available/mpk`
- Logs: `/var/log/nginx/error.log`
- Update: `cd /var/www/mpk && sudo ./update.sh`

## 🎉 You're Ready!

Run the deployment command and your MPK system will be live in 5 minutes!

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Dutasampolaen/mpktahuninikeren/main/deploy.sh)
```

---

**Questions?** Check [VPS_SETUP.md](VPS_SETUP.md) or [COMMANDS.txt](COMMANDS.txt)
