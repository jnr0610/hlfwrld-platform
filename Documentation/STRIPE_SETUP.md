# Stripe Integration Setup Guide

## Prerequisites
1. A Stripe account (sign up at https://stripe.com)
2. Your Stripe API keys

## Setup Instructions

### 1. Get Your Stripe API Keys
1. Log into your Stripe Dashboard
2. Go to Developers → API Keys
3. Copy your **Publishable Key** and **Secret Key**

### 2. Configure Environment Variables
Create a `.env` file in the `backend` directory with the following:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Server Configuration
PORT=3000
```

### 3. Set Up Webhooks (Optional but Recommended)
1. In your Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/webhook`
3. Select events: `checkout.session.completed`
4. Copy the webhook signing secret to your `.env` file

### 4. Test the Integration
1. Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
2. Any future expiry date
3. Any 3-digit CVC

## Features Implemented
- ✅ Real Stripe checkout sessions
- ✅ Payment processing with webhooks
- ✅ Automatic booking confirmation
- ✅ Database updates on successful payment
- ✅ Success page with booking details

## Security Notes
- Never commit your `.env` file to version control
- Use test keys for development
- Switch to live keys only in production
- Always verify webhook signatures in production 