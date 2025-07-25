# 🚀 Hlfwrld Platform Deployment Guide

## 🌐 **Domain Connection & Real-Time Editing**

### **Step 1: Deploy to Vercel (Recommended)**

#### **1.1 Install Vercel CLI**
```bash
npm install -g vercel
```

#### **1.2 Login to Vercel**
```bash
vercel login
```

#### **1.3 Deploy Your Project**
```bash
# From your project root directory
vercel --prod
```

#### **1.4 Connect Custom Domain**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Add your domain: `hlfwrld.com`
5. Follow DNS configuration instructions

### **Step 2: DNS Configuration**

#### **For hlfwrld.com domain:**
```
Type: A
Name: @
Value: 76.76.19.19

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### **Step 3: Environment Variables**

#### **3.1 Create Production Environment File**
Create `.env.production` in your project root:

```env
# Database
DATABASE_URL=your_production_database_url

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@hlfwrld.com

# JWT
JWT_SECRET=your_very_secure_jwt_secret

# Domain
DOMAIN=https://hlfwrld.com
```

#### **3.2 Set Vercel Environment Variables**
```bash
vercel env add DATABASE_URL
vercel env add STRIPE_SECRET_KEY
vercel env add RESEND_API_KEY
vercel env add JWT_SECRET
vercel env add DOMAIN
```

### **Step 4: Real-Time Editing Setup**

#### **4.1 GitHub Integration**
1. Push your code to GitHub
2. Connect GitHub repo to Vercel
3. Enable automatic deployments

#### **4.2 Cursor Real-Time Editing**
1. **Clone from GitHub:**
   ```bash
   git clone https://github.com/yourusername/hlfwrld-platform.git
   cd hlfwrld-platform
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Edit in Cursor:**
   - Open the project in Cursor
   - Make changes to any file
   - Save changes
   - Changes automatically deploy to hlfwrld.com

### **Step 5: Production Database Setup**

#### **5.1 Option A: Vercel Postgres (Recommended)**
```bash
vercel storage create postgres
```

#### **5.2 Option B: External Database**
- Use PlanetScale, Supabase, or AWS RDS
- Update `DATABASE_URL` in environment variables

### **Step 6: SSL & Security**

#### **6.1 Automatic SSL**
Vercel provides automatic SSL certificates for custom domains.

#### **6.2 Security Headers**
Add to your `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

## 🔄 **Real-Time Development Workflow**

### **Local Development:**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend (Live Server)
# Use VS Code Live Server extension
```

### **Production Deployment:**
```bash
# Make changes in Cursor
# Save files
# Git commit and push
# Vercel automatically deploys to hlfwrld.com
```

## 📱 **Mobile Optimization**

### **PWA Setup**
Add to your HTML files:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#667eea">
```

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **Domain Not Loading:**
   - Check DNS propagation (can take 24-48 hours)
   - Verify Vercel domain configuration

2. **API Endpoints Not Working:**
   - Check environment variables
   - Verify API routes in `vercel.json`

3. **Database Connection Issues:**
   - Verify `DATABASE_URL` format
   - Check database credentials

4. **Email Not Sending:**
   - Verify Resend API key
   - Check email domain configuration

## 🚀 **Performance Optimization**

### **1. Image Optimization**
```bash
npm install sharp
```

### **2. Caching**
Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### **3. CDN**
Vercel automatically provides global CDN for static assets.

## 📊 **Monitoring & Analytics**

### **1. Vercel Analytics**
Enable in Vercel dashboard for performance monitoring.

### **2. Error Tracking**
```bash
npm install @sentry/node
```

## 🔐 **Security Checklist**

- [ ] Environment variables set
- [ ] SSL certificate active
- [ ] Security headers configured
- [ ] Database credentials secure
- [ ] API keys protected
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] Rate limiting enabled

## 📞 **Support**

For deployment issues:
1. Check Vercel documentation
2. Review deployment logs
3. Contact Vercel support
4. Check GitHub issues

---

**🎯 Your Hlfwrld platform will be live at: https://hlfwrld.com** 