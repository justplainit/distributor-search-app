# Deployment Guide for Vercel

Your app is now ready to deploy to Vercel! Here's what I've set up:

## ✅ What's Been Configured

1. **Next.js API Routes** - Converted Express server routes to Next.js API routes:
   - `/api/health` - Health check
   - `/api/auth/login` - Authentication
   - `/api/products/search` - Product search
   - `/api/suppliers` - Supplier list
   - `/api/suppliers/[id]/sync` - Supplier sync

2. **Dynamic Routes** - All API routes marked as dynamic (not statically generated)

3. **Frontend Updates** - API URLs now use relative paths (works on Vercel automatically)

4. **Build Configuration** - Added `vercel-build` script and configuration

## 🚀 Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push
   ```

2. **Go to Vercel**:
   - Visit https://vercel.com/new
   - Sign up/Login with GitHub
   - Click "Import Project"
   - Select your repository

3. **Configure Project**:
   - Vercel will auto-detect Next.js
   - Framework Preset: **Next.js**
   - Build Command: `next build` (automatic)
   - Output Directory: `.next` (automatic)
   - Install Command: `npm install` (automatic)

4. **Add Environment Variables** (see below)

5. **Click Deploy**

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd /Users/dietrichvonstaden/distributor-search-local
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: distributor-search (or your choice)
# - Directory: ./
# - Override settings? N
```

## 🔐 Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

### Required:

```bash
# Authentication
JWT_SECRET=your-secret-key-change-in-production

# Mustek API
MUSTEK_API_TOKEN=b9ec44bc-3b40-46f2-bc6d-47bfa5e2c167

# Axiz API
AXIZ_API_BASE_URL=https://api.goaxiz.co.za
AXIZ_CLIENT_ID=JUSTPLAINITPTYLTD_SJJUS999
AXIZ_CLIENT_SECRET=b7ff1630-4a17-481c-aa62-e33ac07a495d
AXIZ_TOKEN_ENDPOINT=https://www.axizdigital.com/connect/token
AXIZ_SCOPE=axiz-api.customers axiz-api.erppricelist axiz-api.internalpricelist axiz-api.markets axiz-api.salesordertracking

# Tarsus API
TARSUS_API_URL=https://feedgen.tarsusonline.co.za/api/DataFeed/Customer-ProductCatalogue
TARSUS_API_TOKEN=86aa5dd962044201b0140d5d983E399b_072c1f6da2fc46b59Df23184CD467b08

# Development Mode (set to true for dev mode without database)
DEV_MODE=true
```

### Optional (for Production with Database):

```bash
# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Node Environment
NODE_ENV=production
```

**Important**: 
- Set these for **all environments** (Production, Preview, Development)
- After adding variables, **redeploy** your project

## 📝 Post-Deployment

1. **Test Your App**:
   - Visit `https://your-project.vercel.app`
   - Test search functionality
   - Verify supplier integrations

2. **Check Logs**:
   - Vercel Dashboard → Your Project → Deployments → Click on deployment → Functions
   - Check for any errors

3. **Monitor Performance**:
   - Vercel Dashboard → Analytics
   - Watch for API response times

## ⚠️ Important Notes

1. **Dev Mode**: With `DEV_MODE=true`, the app works without a database (uses in-memory data loaded on first request)

2. **Serverless Functions**: API routes run as serverless functions:
   - Max timeout: 60 seconds (free tier)
   - Cold starts may occur (first request after inactivity)

3. **Rate Limits**: 
   - Tarsus API has rate limiting - may need to wait between requests
   - Supplier APIs have their own rate limits

4. **Environment Variables**: 
   - Never commit `.env` file to Git
   - All secrets must be in Vercel dashboard

5. **Custom Domain**: 
   - Add custom domain in Vercel Dashboard → Settings → Domains

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)

### API Routes Not Working
- Check that routes are in `app/api/` directory
- Verify `dynamic = 'force-dynamic'` is set
- Check function logs in Vercel dashboard

### Products Not Loading
- Verify environment variables are set correctly
- Check supplier API tokens are valid
- Review function logs for errors

### CORS Errors
- Not needed - all API routes are on same domain
- If needed, check `next.config.js` for CORS settings

## 📚 Files Created/Modified

- ✅ `app/api/` - Next.js API routes (converted from Express)
- ✅ `vercel.json` - Vercel configuration
- ✅ `.vercelignore` - Files to exclude from deployment
- ✅ `next.config.js` - Updated for Vercel
- ✅ `package.json` - Added `vercel-build` script
- ✅ Frontend files - Updated to use relative API URLs

## 🎉 You're Ready!

Your app is configured for Vercel deployment. Just push to Git and deploy!

