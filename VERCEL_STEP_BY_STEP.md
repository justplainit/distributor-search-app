# Vercel Deployment - Step by Step Guide

## Step 1: Go to Vercel

1. Visit: https://vercel.com
2. Click **"Sign Up"** or **"Log In"** (top right)
3. Sign in with GitHub (recommended - it's the easiest)

## Step 2: Add New Project

1. After logging in, you'll see your **Dashboard**
2. Click the **"Add New..."** button (top right)
3. Select **"Project"** from the dropdown

**OR**

If you see a **"New Project"** button, click that instead.

## Step 3: Import GitHub Repository

1. You'll see a list of your GitHub repositories
2. **Find** `justplainit/distributor-search-app` in the list
3. Click **"Import"** next to it

**Don't see it?**
- Click **"Adjust GitHub App Permissions"** or **"Configure GitHub App"**
- Make sure the repository is selected/visible
- Refresh the page

## Step 4: Configure Project

After importing, you'll see a configuration page:

### Framework Preset
- Should auto-detect: **Next.js**
- If not, select **"Next.js"** from the dropdown

### Root Directory
- Leave as **`./`** (default)

### Build and Output Settings
- Leave as **default** (auto-detected)
- Build Command: `next build` (should be automatic)
- Output Directory: `.next` (should be automatic)

### Install Command
- Leave as **`npm install`** (default)

## Step 5: Add Environment Variables

**BEFORE clicking Deploy**, click **"Environment Variables"** (or look for a section with that name)

Add each variable one by one:

1. Click **"Add"** or **"Add Variable"**
2. Enter the **Name** (e.g., `JWT_SECRET`)
3. Enter the **Value** (e.g., `your-secret-key-change-in-production`)
4. Select **Environment**: Check all three:
   - ☑ Production
   - ☑ Preview  
   - ☑ Development
5. Click **"Save"** or **"Add"**
6. Repeat for each variable below

### Required Environment Variables:

```
Name: JWT_SECRET
Value: your-secret-key-change-in-production
Environments: All (Production, Preview, Development)

Name: MUSTEK_API_TOKEN
Value: b9ec44bc-3b40-46f2-bc6d-47bfa5e2c167
Environments: All

Name: AXIZ_API_BASE_URL
Value: https://api.goaxiz.co.za
Environments: All

Name: AXIZ_CLIENT_ID
Value: JUSTPLAINITPTYLTD_SJJUS999
Environments: All

Name: AXIZ_CLIENT_SECRET
Value: b7ff1630-4a17-481c-aa62-e33ac07a495d
Environments: All

Name: AXIZ_TOKEN_ENDPOINT
Value: https://www.axizdigital.com/connect/token
Environments: All

Name: AXIZ_SCOPE
Value: axiz-api.customers axiz-api.erppricelist axiz-api.internalpricelist axiz-api.markets axiz-api.salesordertracking
Environments: All

Name: TARSUS_API_URL
Value: https://feedgen.tarsusonline.co.za/api/DataFeed/Customer-ProductCatalogue
Environments: All

Name: TARSUS_API_TOKEN
Value: 86aa5dd962044201b0140d5d983E399b_072c1f6da2fc46b59Df23184CD467b08
Environments: All

Name: DEV_MODE
Value: true
Environments: All
```

## Step 6: Deploy

1. After adding environment variables, click **"Deploy"** button (bottom of the page)
2. Wait for the build to complete (usually 1-2 minutes)
3. You'll see build logs in real-time

## Step 7: Your App is Live!

Once deployment completes:
- Your app will be at: `https://distributor-search-app.vercel.app` (or similar)
- Click **"Visit"** or **"Open"** to see your live app

## Alternative: If You Already Have a Project

If the repository is already connected to Vercel:

1. Go to your **Dashboard**
2. Find **"distributor-search-app"** project
3. Click on it
4. Go to **Settings** (top menu)
5. Click **"Environment Variables"** (left sidebar)
6. Add all the variables listed above
7. Go to **Deployments** tab
8. Click **"..."** (three dots) on the latest deployment
9. Click **"Redeploy"**

## Troubleshooting

### Can't find "Add New Project"?
- Look for **"New Project"** button
- Or go to: https://vercel.com/new

### Can't see your repository?
- Make sure you're logged in with the correct GitHub account
- Check that the repository is public, or you've granted Vercel access to private repos
- Click **"Adjust GitHub App Permissions"**

### Where are Environment Variables?
- They're usually in the **project configuration page** before deployment
- Or in **Settings → Environment Variables** after project is created
- Look for a section labeled **"Environment Variables"** or **"Env Vars"**

### Build Fails?
- Check the build logs in the Vercel dashboard
- Make sure all environment variables are added
- Verify Node.js version (Vercel uses Node 18+ by default)

