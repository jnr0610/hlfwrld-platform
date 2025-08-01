#!/bin/bash

echo "🚀 Deploying to Railway..."

# Add all changes
git add .

# Commit with timestamp
git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"

# Push to GitHub (triggers Railway deployment)
git push origin main

echo "✅ Pushed to GitHub - Railway will auto-deploy shortly!"
echo "🌐 Your changes will be live at https://www.hlfwrld.com in 2-3 minutes" 