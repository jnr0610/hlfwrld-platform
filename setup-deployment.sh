#!/bin/bash

echo "🚀 Hlfwrld Platform Deployment Setup"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Node.js and Git are installed"

# Install Vercel CLI
echo "📦 Installing Vercel CLI..."
npm install -g vercel

# Initialize Git if not already done
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - Hlfwrld platform"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create production environment template
echo "🔧 Creating production environment template..."
cat > .env.production.template << EOF
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
EOF

echo "✅ Setup complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Edit .env.production.template with your actual values"
echo "2. Rename it to .env.production"
echo "3. Run: vercel login"
echo "4. Run: vercel --prod"
echo "5. Connect your hlfwrld.com domain in Vercel dashboard"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md" 