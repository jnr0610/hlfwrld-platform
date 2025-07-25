# 🔗 GitHub & Vercel Setup Guide

## 📋 **Prerequisites**
- GitHub account created
- GitHub username: [YOUR_USERNAME] (replace this with your actual username)

## 🚀 **Step 1: Create GitHub Repository**

1. Go to [GitHub.com](https://github.com) and sign in
2. Click "New Repository" (green button)
3. Repository name: `hlfwrld-platform`
4. Make it **Public** (required for free Vercel)
5. **Don't** initialize with README (we already have files)
6. Click "Create Repository"

## 🔗 **Step 2: Connect Local Project to GitHub**

Replace `[YOUR_USERNAME]` with your actual GitHub username in these commands:

```bash
# Add GitHub as remote
git remote add origin https://github.com/[YOUR_USERNAME]/hlfwrld-platform.git

# Push to GitHub
git push -u origin main
```

## 🚀 **Step 3: Deploy to Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## 🔗 **Step 4: Connect GitHub to Vercel**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Select "Import Git Repository"
4. Choose your `hlfwrld-platform` repository
5. Click "Deploy"

## 🌐 **Step 5: Connect Your Domain**

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add: `hlfwrld.com`
4. Follow DNS configuration instructions

## 🔄 **Step 6: Test Automatic Updates**

After everything is set up:

```bash
# 1. Make a small change in Cursor
# 2. Save the file (Cmd+S)

# 3. Commit and push
git add .
git commit -m "Test automatic deployment"
git push

# 4. Wait 30 seconds
# 5. Visit https://hlfwrld.com - see your changes!
```

## ✅ **Success Checklist**

- [ ] GitHub repository created
- [ ] Local project connected to GitHub
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] GitHub connected to Vercel
- [ ] Domain connected (hlfwrld.com)
- [ ] Test edit deployed automatically

---

**🎯 Once complete, every edit in Cursor will automatically update your website!** 