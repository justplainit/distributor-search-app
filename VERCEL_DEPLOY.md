# Vercel Deployment Guide

This guide will help you deploy the Distributor Search app to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. GitHub/GitLab/Bitbucket account (for connecting your repository)

## Step 1: Prepare Your Repository

1. Make sure your code is committed to a Git repository
2. Push to GitHub/GitLab/Bitbucket if not already done

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect Next.js
4. Configure environment variables (see Step 3)
5. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

## Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

### Required Variables:

```
# Authentication
JWT_SECRET=your-secret-key-here-change-in-production

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

```
# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Node Environment
NODE_ENV=production
```

## Step 4: Update Frontend API URL

The frontend will automatically use relative paths in production, but ensure `NEXT_PUBLIC_API_URL` is NOT set (or set to empty) so it uses the same domain.

## Step 5: Build Settings

Vercel will auto-detect:
- **Framework Preset**: Next.js
- **Build Command**: `next build` (automatic)
- **Output Directory**: `.next` (automatic)
- **Install Command**: `npm install` (automatic)

## Step 6: Deploy

After deployment:
1. Your app will be live at `https://your-project.vercel.app`
2. API routes will be available at `https://your-project.vercel.app/api/*`
3. Check the deployment logs for any errors

## Troubleshooting

### API Routes Not Working
- Ensure all API route files are in `app/api/` directory
- Check function timeout (max 60 seconds on free tier)
- Verify environment variables are set correctly

### Build Errors
- Check that all dependencies are in `package.json`
- Ensure Node.js version is compatible (Vercel uses Node 18+ by default)

### Environment Variables Not Loading
- Make sure variables are set for all environments (Production, Preview, Development)
- Restart deployment after adding new variables

## Post-Deployment

1. Test all API endpoints
2. Verify supplier integrations are working
3. Check that products are loading correctly
4. Monitor Vercel dashboard for any errors

## Notes

- **Dev Mode**: With `DEV_MODE=true`, the app will work without a database (uses in-memory data)
- **Serverless Functions**: All API routes run as serverless functions with 60s timeout
- **Cold Starts**: First request may be slower (serverless cold start)
- **Rate Limits**: Be aware of supplier API rate limits (especially Tarsus)

