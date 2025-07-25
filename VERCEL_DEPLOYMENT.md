# 🚀 Vercel Deployment Guide (Web Interface)

## ✅ **Step 1: Deploy to Vercel**

1. **Go to [Vercel.com](https://vercel.com)**
2. **Sign up/Login** with your GitHub account (`jnr0610`)
3. **Click "New Project"**
4. **Import Git Repository** - select `hlfwrld-platform`
5. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `./` (default)
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)
6. **Click "Deploy"**

## 🔧 **Step 2: Set Environment Variables**

After deployment, go to your project settings:

1. **Click on your project** in Vercel dashboard
2. **Go to "Settings" → "Environment Variables"**
3. **Add these variables:**

```
STRIPE_SECRET_KEY = sk_test_your_stripe_test_key
STRIPE_PUBLISHABLE_KEY = pk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET = whsec_your_webhook_secret
RESEND_API_KEY = your_resend_api_key
FROM_EMAIL = noreply@hlfwrld.com
JWT_SECRET = your_very_secure_jwt_secret
DOMAIN = https://your-vercel-url.vercel.app
```

## 🌐 **Step 3: Connect Custom Domain**

1. **Go to "Settings" → "Domains"**
2. **Add Domain:** `hlfwrld.com`
3. **Follow DNS instructions** to point to Vercel

## 🔄 **Step 4: Test Automatic Updates**

After setup:

```bash
# 1. Make changes in Cursor
# 2. Save files (Cmd+S)

# 3. Commit and push
git add .
git commit -m "Test automatic deployment"
git push

# 4. Wait 30 seconds
# 5. Visit your Vercel URL - see changes live!
```

## 📱 **Your Platform URLs**

- **Vercel URL:** https://your-project-name.vercel.app
- **Custom Domain:** https://hlfwrld.com (after DNS setup)
- **Creator Signup:** /User%20Authentication/creator-auth.html
- **Salon Signup:** /User%20Authentication/salon-signup.html

## ✅ **Success Checklist**

- [ ] Vercel project created
- [ ] GitHub repository connected
- [ ] Environment variables set
- [ ] Custom domain connected (optional)
- [ ] Test edit deployed automatically

---

**🎯 This approach is much more reliable than CLI installation!** 