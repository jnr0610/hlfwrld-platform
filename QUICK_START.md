# ⚡ Quick Start Guide - Hlfwrld Platform

## 🚀 **Deploy to hlfwrld.com in 5 Minutes**

### **Step 1: Run Setup Script**
```bash
./setup-deployment.sh
```

### **Step 2: Deploy to Vercel**
```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### **Step 3: Connect Your Domain**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Add: `hlfwrld.com`
5. Configure DNS records as shown

### **Step 4: Set Environment Variables**
```bash
# Set each variable (replace with your actual values)
vercel env add STRIPE_SECRET_KEY
vercel env add RESEND_API_KEY
vercel env add JWT_SECRET
vercel env add DOMAIN
```

## 🔄 **Real-Time Editing in Cursor**

### **Option 1: GitHub + Auto-Deploy (Recommended)**
```bash
# 1. Create GitHub repository
# 2. Push your code
git remote add origin https://github.com/yourusername/hlfwrld-platform.git
git push -u origin main

# 3. Connect GitHub to Vercel in dashboard
# 4. Edit in Cursor → Save → Push → Auto-deploy to hlfwrld.com
```

### **Option 2: Direct Vercel Deploy**
```bash
# Edit in Cursor
# Save files
# Deploy changes
vercel --prod
```

## 🌐 **Your Platform URLs**

- **Production:** https://hlfwrld.com
- **Creator Signup:** https://hlfwrld.com/User%20Authentication/creator-auth.html
- **Salon Signup:** https://hlfwrld.com/User%20Authentication/salon-signup.html
- **Creator Dashboard:** https://hlfwrld.com/Dashboards/influencer-dashboard.html
- **Salon Dashboard:** https://hlfwrld.com/Dashboards/salon-dashboard.html

## 🔧 **Local Development**

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend (Live Server)
# Use VS Code Live Server extension
```

## 📱 **Test Your Platform**

1. **Creator Flow:**
   - Visit: https://hlfwrld.com/User%20Authentication/creator-auth.html
   - Sign up as creator
   - Create digital shop
   - Share profile link

2. **Salon Flow:**
   - Visit: https://hlfwrld.com/User%20Authentication/salon-signup.html
   - Sign up as salon
   - Accept terms of service
   - View service requests

3. **Client Flow:**
   - Visit creator's public profile
   - Request appointment
   - Receive email with time options
   - Book and pay

## 🎯 **Success Checklist**

- [ ] Platform deployed to hlfwrld.com
- [ ] SSL certificate active (https://)
- [ ] Creator signup working
- [ ] Salon signup working
- [ ] Terms of service displayed
- [ ] Email notifications working
- [ ] Stripe payments working
- [ ] Real-time editing set up

## 🆘 **Need Help?**

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Review Vercel deployment logs
3. Test locally first: `npm run dev`
4. Check environment variables

---

**🎉 Your Hlfwrld platform is now live at https://hlfwrld.com!** 