# Quick Email Setup Guide

## 🚀 Get Email Working in 5 Minutes with Resend

### Step 1: Sign Up for Resend (1 minute)
1. Go to [resend.com](https://resend.com)
2. Click "Sign Up" 
3. Use GitHub or email to create account
4. **No credit card required!**

### Step 2: Get Your API Key (1 minute)
1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Copy the key (starts with `re_`)

### Step 3: Set Up Environment Variables (1 minute)
1. Create `.env` file in your `backend` folder
2. Add these lines:
```bash
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
EMAIL_SERVICE=resend
```

### Step 4: Test Your Setup (2 minutes)
1. Start your server: `npm start`
2. Try sending a test email through your booking system
3. Check Resend dashboard for delivery status

## ✅ You're Done!

Your booking system can now send emails immediately:
- ✅ Appointment confirmations
- ✅ Booking reminders  
- ✅ Welcome emails
- ✅ Service notifications

## 🔄 Switching to AWS SES Later

When AWS approves your quota increase:

1. Update your `.env` file:
```bash
EMAIL_SERVICE=ses
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

2. Restart your server - emails will automatically use AWS SES

## 📊 Resend vs AWS SES Comparison

| Feature | Resend | AWS SES |
|---------|--------|---------|
| **Setup Time** | 5 minutes | Days/weeks |
| **Free Tier** | 3,000 emails/month | 62,000 emails/month |
| **Approval** | None | Manual review |
| **Pricing** | $0.80/1,000 | $0.10/1,000 |
| **Best For** | Getting started | High volume |

## 🎯 Recommendation

**Start with Resend** to get your booking system working immediately, then **migrate to AWS SES** when you need the cost savings at scale. 