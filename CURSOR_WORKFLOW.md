# 🎯 Cursor Workflow - Automatic Website Updates

## ✅ **How to Get Automatic Updates**

### **Step 1: Create GitHub Repository**
1. Go to [GitHub.com](https://github.com)
2. Click "New Repository"
3. Name it: `hlfwrld-platform`
4. Make it **Public** (for free Vercel deployment)
5. Don't initialize with README (we already have files)

### **Step 2: Connect Your Local Project**
```bash
# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/hlfwrld-platform.git

# Push to GitHub
git push -u origin main
```

### **Step 3: Deploy to Vercel (Web Interface)**
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

### **Step 4: Set Environment Variables**
1. **Click on your project** in Vercel dashboard
2. **Go to "Settings" → "Environment Variables"**
3. **Add your environment variables** (see VERCEL_DEPLOYMENT.md for details)

### **Step 5: Connect Your Domain**
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add: `hlfwrld.com`
4. Follow DNS instructions

## 🔄 **Automatic Update Workflow**

### **Every Time You Edit in Cursor:**

```bash
# 1. Make changes in Cursor
# 2. Save files (Cmd+S)

# 3. Commit changes
git add .
git commit -m "Updated [describe your changes]"

# 4. Push to GitHub
git push

# 5. Vercel automatically deploys in ~30 seconds!
# 6. Your website updates at https://hlfwrld.com
```

### **Example Workflow:**
```bash
# Edit a page in Cursor
# Save the file

# Commit and push
git add .
git commit -m "Updated creator dashboard styling"
git push

# Wait 30 seconds
# Visit https://hlfwrld.com/Dashboards/influencer-dashboard.html
# See your changes live!
```

## 🚀 **Quick Commands**

### **For Small Changes:**
```bash
git add . && git commit -m "Quick update" && git push
```

### **For New Pages:**
```bash
# Create new page in Cursor
# Save file
git add .
git commit -m "Added new contact page"
git push
```

### **For Major Updates:**
```bash
git add .
git commit -m "Major update: Added payment system and booking flow"
git push
```

## 📱 **Test Your Updates**

After pushing changes, test these URLs:
- **Home:** https://hlfwrld.com
- **Creator Signup:** https://hlfwrld.com/User%20Authentication/creator-auth.html
- **Salon Signup:** https://hlfwrld.com/User%20Authentication/salon-signup.html
- **Creator Dashboard:** https://hlfwrld.com/Dashboards/influencer-dashboard.html
- **Salon Dashboard:** https://hlfwrld.com/Dashboards/salon-dashboard.html

## ⚡ **Pro Tips**

### **1. Use Cursor's Git Integration**
- Cursor has built-in Git support
- You can commit and push directly from Cursor
- No need to use terminal every time

### **2. Check Deployment Status**
- Go to Vercel dashboard
- See deployment logs
- Check if deployment succeeded

### **3. Rollback if Needed**
- In Vercel dashboard, go to "Deployments"
- Click on any previous deployment
- Click "Redeploy" to go back

### **4. Preview Changes**
- Use `vercel` (without --prod) for preview
- Test changes before going live

## 🔧 **Troubleshooting**

### **Changes Not Appearing?**
1. Check if you pushed to GitHub: `git status`
2. Check Vercel deployment logs
3. Clear browser cache (Cmd+Shift+R)
4. Wait a few more seconds

### **Deployment Failed?**
1. Check Vercel logs for errors
2. Verify all files are committed
3. Check environment variables
4. Test locally first: `npm run dev`

## 🎯 **Success Checklist**

- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Vercel project connected to GitHub
- [ ] Domain connected (hlfwrld.com)
- [ ] Made a test edit and pushed
- [ ] Saw changes live on website

---

**🎉 Now every edit in Cursor will automatically update your website!** 