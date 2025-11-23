# Quick Start Guide - MPK Tahunan Nikeren

## 🚀 5-Minute Setup

### Step 1: Push to GitHub (2 minutes)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/Dutasampolaen/mpktahuninikeren.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Netlify (2 minutes)
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub → Select `mpktahuninikeren`
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables (from your `.env` file):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy"

### Step 3: Configure Domain (1 minute)
1. In Netlify: Site settings → Domain management
2. Add custom domain: `mpk.aynshop.com`
3. Update your DNS:
   - Type: `CNAME`
   - Name: `mpk`
   - Value: `your-site.netlify.app`

### Step 4: Create Admin Account
1. Visit https://mpk.aynshop.com
2. Sign up with your email
3. Go to Supabase SQL Editor and run:
   ```sql
   UPDATE users
   SET roles = '["admin"]'::jsonb
   WHERE email = 'your-email@example.com';
   ```

### Step 5: Import Members
1. Login as admin
2. Go to "Members" page
3. Click "Bulk Import"
4. Paste your CSV data:
   ```
   name,nis,email,password,class,commission
   Ahmad Suharto,10001,ahmad@school.com,pass123,10A,Sekbid 1
   Budi Santoso,10002,budi@school.com,pass456,10B,Sekbid 2
   ```
5. Click "Preview Data" → "Import"

## ✅ Done!

Your MPK system is now live at **https://mpk.aynshop.com**

## What's Included

✅ Database is clean and ready
✅ All migrations applied
✅ 12 commissions configured (Komisi A,B,C + Sekbid 1-9)
✅ Complete member management with edit & bulk import
✅ Program management system
✅ Scoring system
✅ Committee assignment system
✅ Workload tracking

## Next Actions

1. **Import Members**: Use bulk import to add all your MPK members
2. **Create Programs**: Add your school programs and events
3. **Assign Committees**: Use the Panitia Assignment feature
4. **Track Workload**: Monitor member assignments

## Need More Help?

- Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- GitHub setup: [GITHUB_SETUP.md](./GITHUB_SETUP.md)
- Feature documentation: [README.md](./README.md)

## Troubleshooting

**Can't login?**
- Make sure you promoted your account to admin in SQL
- Check that environment variables are set in Netlify

**Domain not working?**
- DNS can take up to 48 hours to propagate
- Verify CNAME record is correct

**Build failed?**
- Check Netlify build logs
- Verify environment variables are set
- Try building locally: `npm run build`

## Support

For issues or questions, check the detailed guides or contact the development team.
