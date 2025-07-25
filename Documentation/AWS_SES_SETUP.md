# AWS SES Setup Guide for Salon Booking System

## 🚀 Quick Start (Starter Option - $3-30/month)

This guide will help you set up AWS SES (Simple Email Service) to send real emails for your salon booking system while keeping everything else running locally.

## 📋 Prerequisites

1. **AWS Account** (free to create)
2. **Domain name** (optional - you can use AWS default domain for testing)
3. **Node.js** (already installed)

## 🔧 Step 1: Create AWS Account

1. Go to [AWS Console](https://aws.amazon.com/)
2. Click "Create an AWS Account"
3. Follow the signup process (requires credit card for verification)
4. **Note**: You won't be charged unless you exceed the free tier

## 🔑 Step 2: Create IAM User for SES

1. **Login to AWS Console**
2. **Go to IAM Service**
3. **Create User**:
   - Click "Users" → "Add user"
   - Username: `ses-email-user`
   - Access type: "Programmatic access"
4. **Attach Policy**:
   - Click "Attach existing policies directly"
   - Search for "AmazonSESFullAccess"
   - Select it and click "Next"
5. **Review and Create**:
   - Click "Create user"
   - **IMPORTANT**: Download the CSV file with Access Key ID and Secret Access Key

## 📧 Step 3: Set Up SES

1. **Go to SES Service** in AWS Console
2. **Verify Email Address** (for testing):
   - Click "Email Addresses" → "Verify a New Email Address"
   - Enter your email (e.g., `your-email@gmail.com`)
   - Check your email and click the verification link
3. **Request Production Access** (optional):
   - By default, you're in "Sandbox Mode" (can only send to verified emails)
   - For production, click "Account Dashboard" → "Request Production Access"
   - This allows sending to any email address

## ⚙️ Step 4: Configure Environment Variables

1. **Open your `.env` file** in the `backend` folder
2. **Add these lines**:

```env
# AWS SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_SES_FROM_EMAIL=your-verified-email@gmail.com
AWS_SES_CONFIGURATION_SET=your-config-set-name
```

3. **Replace the values**:
   - `your_access_key_here`: From the CSV file you downloaded
   - `your_secret_key_here`: From the CSV file you downloaded
   - `your-verified-email@gmail.com`: The email you verified in SES
   - `your-config-set-name`: Optional - for advanced deliverability tracking

## 🧪 Step 5: Test the Setup

1. **Restart your backend server**:
   ```bash
   cd backend
   node index.js
   ```

2. **Test by sending a booking time option**:
   - Go to your salon dashboard
   - Respond to a service request with time options
   - Check the console for AWS SES logs

## 💰 Cost Breakdown

### **Free Tier (First 12 months)**
- **62,000 emails/month** when sent from EC2
- **1,000 emails/month** when sent from other sources
- **Cost**: $0

### **After Free Tier**
- **$0.10 per 1,000 emails**
- **1,000 emails/day**: ~$3/month
- **10,000 emails/day**: ~$30/month

## 🔒 Security Best Practices

1. **Never commit credentials to git**
2. **Use IAM roles** instead of access keys in production
3. **Enable CloudTrail** for audit logging
4. **Set up billing alerts** to monitor costs

## 🚨 Troubleshooting

### **"Email address not verified" error**
- Make sure you've verified your sender email in SES
- In sandbox mode, recipient emails must also be verified

### **"Access denied" error**
- Check your AWS credentials in `.env`
- Ensure the IAM user has SES permissions

### **"Region not found" error**
- Make sure `AWS_REGION` is set correctly (e.g., `us-east-1`)

### **Emails going to spam**
- Use a professional sender name (e.g., "Salon Name" instead of "noreply")
- Avoid spam trigger words in subject lines
- Send from a verified domain instead of Gmail
- Request production access from AWS SES
- Set up SPF and DKIM records for your domain

## 📈 Scaling Up

### **When to move to production access**:
- You're sending to real customers (not just verified emails)
- You need higher sending limits
- You want to send from a custom domain

### **When to add EC2**:
- You need 24/7 uptime
- You want to handle more traffic
- You need better performance

## 📧 Improving Email Deliverability

### **Professional Email Setup**:
1. **Use a custom domain** (e.g., `appointments@yoursalon.com`)
2. **Set up SPF and DKIM records** for your domain
3. **Request production access** from AWS SES
4. **Monitor bounce and complaint rates**

### **Email Content Best Practices**:
- ✅ Use professional subject lines
- ✅ Include salon name in sender
- ✅ Avoid spam trigger words
- ✅ Keep content personal and relevant
- ✅ Include clear call-to-action

### **Spam Trigger Words to Avoid**:
- ❌ "Free", "Act Now", "Limited Time"
- ❌ "Click Here", "Buy Now", "Special Offer"
- ❌ "Urgent", "Important", "Exclusive"
- ❌ "Guaranteed", "No Risk", "Money Back"

## 🎯 Next Steps

1. **Test thoroughly** with your verified email
2. **Monitor costs** in AWS Billing Dashboard
3. **Set up production access** when ready
4. **Consider custom domain** for professional emails

## 📞 Support

- **AWS SES Documentation**: https://docs.aws.amazon.com/ses/
- **AWS Support**: Available in AWS Console
- **Cost Calculator**: https://calculator.aws/

---

**Total Setup Time**: ~30 minutes
**Monthly Cost**: $3-30 (depending on email volume)
**Free Tier**: 62,000 emails/month for first 12 months 