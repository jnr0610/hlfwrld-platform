# Resend Email Setup (Alternative to AWS SES)

## Why Resend?
- **5-minute setup** vs AWS SES's complex verification process
- **3,000 free emails/month** 
- **Excellent deliverability**
- **Modern, developer-friendly API**

## Quick Setup Steps:

### 1. Sign Up (1 minute)
- Go to [resend.com](https://resend.com)
- Sign up with GitHub or email
- No credit card required for free tier

### 2. Get API Key (1 minute)
- Go to API Keys section
- Create a new API key
- Copy the key (starts with `re_`)

### 3. Add to Environment Variables (1 minute)
Add to your `.env` file:
```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 4. Install Package (1 minute)
```bash
cd backend
npm install resend
```

### 5. You're Done! 🎉

## Domain Verification (Optional - for production)
- Add your domain in Resend dashboard
- Add DNS records (much simpler than AWS SES)
- Verify domain (usually instant)

## Pricing Comparison:
- **Resend**: 3,000 free emails/month, then $0.80/1,000
- **AWS SES**: 62,000 free emails/month, then $0.10/1,000
- **SendGrid**: 100 free emails/day, then $14.95/month for 50k

## Other Quick Alternatives:

### SendGrid
```bash
npm install @sendgrid/mail
```
- Setup: 5 minutes
- Free: 100 emails/day
- Good for: High volume, marketing emails

### Mailgun
```bash
npm install mailgun.js
```
- Setup: 5 minutes  
- Free: 5,000 emails/month (3 months)
- Good for: Transactional emails

### Postmark
```bash
npm install postmark
```
- Setup: 5 minutes
- Free: 100 emails/month
- Good for: Transactional emails only

## Recommendation:
For your use case, **Resend** is the best choice because:
1. Fastest setup
2. Good free tier
3. Excellent deliverability
4. Modern API
5. No complex domain verification needed initially 