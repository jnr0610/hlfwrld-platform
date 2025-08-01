# 🚂 Railway Deployment Guide

## Step 1: Prepare Your Repository

1. **Ensure your `package.json` has the start script**:
```json
{
  "scripts": {
    "start": "node backend/index.js",
    "dev": "nodemon backend/index.js"
  }
}
```

2. **Create a `railway.json` file** in your project root:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && node index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Step 2: Deploy to Railway

1. **Sign up**: Go to [railway.app](https://railway.app)
2. **Connect GitHub**: Click "Login with GitHub"
3. **New Project**: Click "New Project" → "Deploy from GitHub repo"
4. **Select Repository**: Choose your `Booking2` repository
5. **Deploy**: Railway will automatically detect Node.js and deploy

## Step 3: Configure Environment Variables

In Railway dashboard, go to your project → **Variables** tab:

```
RESEND_API_KEY=your_resend_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
EMAIL_SERVICE=resend
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PORT=3000
NODE_ENV=production
```

## Step 4: Custom Domain Setup

1. **In Railway Dashboard**:
   - Go to your project → **Settings** → **Domains**
   - Click "Custom Domain"
   - Enter your domain: `yourdomain.com`

2. **Update Your DNS** (at your domain registrar):
   ```
   Type: CNAME
   Name: @ (or www)
   Value: your-app-name.up.railway.app
   ```

3. **SSL Certificate**: Railway automatically provides SSL

## Step 5: Database Considerations

**Option A: Keep SQLite** (Simple)
- Your SQLite file will persist in Railway
- Good for getting started quickly

**Option B: Upgrade to PostgreSQL** (Recommended for production)
- Add PostgreSQL service in Railway
- Update your connection string
- More reliable for production

## Step 6: Update Your Frontend URLs

Update the API base URL in your frontend files:
```javascript
// Change from:
const API_BASE = 'http://localhost:3000';

// To:
const API_BASE = 'https://yourdomain.com';
```

## Step 7: Stripe Webhook Configuration

1. **In Stripe Dashboard**:
   - Go to Webhooks
   - Update endpoint URL to: `https://yourdomain.com/webhook/stripe`
   - Update webhook secret in Railway environment variables

## Step 8: Test Your Deployment

1. **Visit your domain**: `https://yourdomain.com`
2. **Test the booking flow**:
   - Creator signup
   - Salon signup
   - Service request
   - Payment flow
   - Email notifications

## 🔧 Troubleshooting

**Build Fails?**
- Check your `package.json` scripts
- Ensure all dependencies are listed
- Check Railway build logs

**Environment Variables Not Working?**
- Verify they're set in Railway dashboard
- Check for typos in variable names
- Restart the deployment

**Domain Not Working?**
- Check DNS propagation (can take 24-48 hours)
- Verify CNAME record is correct
- Try `www.yourdomain.com` vs `yourdomain.com`

## 💰 Pricing

- **Free Tier**: $5 credit to start
- **Pro Plan**: $5/month per service
- **Database**: Additional $5/month for PostgreSQL

## 🚀 Alternative: Render

If Railway doesn't work, try **Render**:

1. **Sign up**: [render.com](https://render.com)
2. **New Web Service**: Connect GitHub
3. **Build Command**: `npm install`
4. **Start Command**: `cd backend && node index.js`
5. **Environment Variables**: Add all your env vars
6. **Custom Domain**: Add in dashboard settings

Both platforms are much more reliable than Vercel for Node.js applications! 