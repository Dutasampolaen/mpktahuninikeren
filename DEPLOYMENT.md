# MPK Tahunan Nikeren - Deployment Guide

## Project Information
- **Repository**: mpktahuninikeren
- **GitHub User**: Dutasampolaen
- **Domain**: mpk.aynshop.com

## Prerequisites
1. GitHub account (Dutasampolaen)
2. Domain configured: mpk.aynshop.com
3. Hosting platform (Netlify/Vercel recommended)
4. Supabase account with existing project

## Deployment Steps

### 1. Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: MPK Management System"

# Add remote
git remote add origin https://github.com/Dutasampolaen/mpktahuninikeren.git

# Push to main branch
git branch -M main
git push -u origin main
```

### 2. Deploy to Netlify (Recommended)

#### Option A: Using Netlify UI
1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Connect to GitHub and select `Dutasampolaen/mpktahuninikeren`
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
6. Deploy!

#### Option B: Using Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### 3. Configure Custom Domain

#### On Netlify:
1. Go to Site settings > Domain management
2. Click "Add custom domain"
3. Enter: `mpk.aynshop.com`
4. Follow DNS configuration instructions

#### DNS Settings (at your domain provider):
Add these records:

**For Netlify:**
- Type: `CNAME`
- Name: `mpk` (or `@` for root domain)
- Value: `[your-site-name].netlify.app`

**Or use A Record:**
- Type: `A`
- Name: `mpk`
- Value: `75.2.60.5` (Netlify's load balancer)

### 4. Alternative: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Configure domain in Vercel dashboard following similar steps.

## Environment Variables

Your `.env` file should contain:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**IMPORTANT**: Never commit `.env` to GitHub. It's already in `.gitignore`.

## Post-Deployment Setup

### 1. Create Admin Account
Since the database is now empty, you'll need to create an admin account:

```sql
-- Run this in Supabase SQL Editor
-- Replace the email and create a strong password

-- First, sign up through the app UI at mpk.aynshop.com
-- Then run this SQL to make the user an admin:

UPDATE users
SET roles = '["admin"]'::jsonb
WHERE email = 'your-admin-email@example.com';
```

### 2. Import Initial Data
Use the bulk import feature to add members:
1. Login as admin
2. Go to Members page
3. Click "Bulk Import"
4. Paste CSV data with format:
   ```
   name,nis,email,password,class,commission
   John Doe,10001,john@school.com,pass123,10A,
   ```

### 3. Add Commissions
The following commissions are pre-configured in migrations:
- Komisi A, B, C
- Sekbid 1-9

If you need to add more, use the Settings page or SQL:

```sql
INSERT INTO commissions (name, description)
VALUES ('New Commission', 'Description here');
```

## SSL Certificate
Both Netlify and Vercel provide free SSL certificates automatically.

## Continuous Deployment
Once connected to GitHub:
- Any push to `main` branch will trigger automatic deployment
- Preview deployments for pull requests

## Monitoring
- Check Netlify/Vercel dashboard for deploy status
- View logs in the deployment platform
- Monitor Supabase dashboard for database issues

## Troubleshooting

### Build Fails
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run typecheck
```

### Environment Variables Not Working
- Make sure they start with `VITE_`
- Redeploy after adding/changing variables
- Clear build cache in deployment platform

### Domain Not Working
- Wait for DNS propagation (can take up to 48 hours)
- Verify DNS records are correct
- Check SSL certificate status

## Maintenance

### Update Dependencies
```bash
npm update
npm audit fix
```

### Database Backups
- Enable Supabase automatic backups
- Export data regularly from Supabase dashboard

## Support
For issues, check:
- Netlify/Vercel logs
- Browser console for frontend errors
- Supabase logs for database errors

## Security Checklist
- ✅ Environment variables configured
- ✅ SSL certificate active
- ✅ RLS policies enabled on all tables
- ✅ Admin account secured with strong password
- ✅ `.env` file in `.gitignore`
- ✅ Supabase project in production mode
