# 🔗 Complete Stripe Connect Setup Guide for Influencer Commissions

## 🎯 Overview
This guide will help you set up Stripe Connect so influencers can receive their 15% commission automatically when clients book appointments through their profiles.

## ✅ What's Already Done

1. **Database Schema** ✅
   - `influencers` table with Stripe Connect fields
   - `bookings` table for commission tracking
   - Commission calculation logic (15%)

2. **Backend API Endpoints** ✅
   - `/influencer/create-connect-account` - Creates Stripe Connect account
   - `/booking/create-with-commission` - Creates booking with commission split
   - `/influencer/earnings/:influencerId` - Gets influencer earnings

3. **Commission Logic** ✅
   - 15% commission rate
   - Automatic payment splitting
   - Earnings tracking

## 🔧 Setup Steps

### Step 1: Enable Stripe Connect

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/connect/overview
2. **Click "Get Started"** or "Enable Connect"
3. **Choose "Express"** as the account type (easiest for influencers)
4. **Complete the setup**:
   - Business information
   - Verification requirements
   - Payout settings

### Step 2: Configure Connect Settings

1. **Go to Connect Settings**: https://dashboard.stripe.com/connect/settings
2. **Set up your business profile**:
   - Business name: "Hlfwrld"
   - Business URL: Your website
   - Support email: Your support email

3. **Configure payout settings**:
   - Payout schedule (daily, weekly, monthly)
   - Minimum payout amount
   - Bank account for your platform

### Step 3: Test the System

Once Connect is enabled, run the test script:
```bash
cd backend
node setup-stripe-connect.js
```

## 🎯 How the Commission System Works

### **Influencer Onboarding Flow:**
1. Influencer signs up for your platform
2. System creates Stripe Connect Express account
3. Influencer completes Stripe onboarding (bank account, verification)
4. Influencer is ready to receive commissions

### **Booking with Commission Flow:**
1. Client books appointment through influencer's profile
2. System calculates 15% commission
3. Stripe processes payment with automatic split:
   - **85%** goes to salon
   - **15%** goes to influencer
4. Commission is automatically transferred to influencer's bank account

### **Example Transaction:**
- **Service Fee**: $100
- **Platform Commission (20%)**: $20 → Platform keeps $5, pays $15 to influencer
- **Salon Receives**: $80
- **Influencer Receives**: $15 (from platform's $20)
- **Platform Retains**: $5

## 💳 Commission Structure

| Service Fee | Platform Commission (20%) | Salon Receives | Influencer Receives | Platform Retains |
|-------------|---------------------------|----------------|-------------------|------------------|
| $50 | $10.00 | $40.00 | $7.50 | $2.50 |
| $100 | $20.00 | $80.00 | $15.00 | $5.00 |
| $200 | $40.00 | $160.00 | $30.00 | $10.00 |

## 🔍 API Endpoints

### **Create Influencer Connect Account**
```javascript
POST /influencer/create-connect-account
{
  "influencerId": 123,
  "email": "influencer@example.com",
  "fullName": "John Doe"
}
```

### **Create Booking with Commission**
```javascript
POST /booking/create-with-commission
{
  "requestId": 456,
  "influencerId": 123,
  "salonId": 789,
  "clientName": "Jane Smith",
  "clientEmail": "jane@example.com",
  "serviceName": "Hair Styling",
  "serviceFee": 100.00,
  "appointmentDate": "2024-01-15",
  "appointmentTime": "14:00"
}
```

### **Get Influencer Earnings**
```javascript
GET /influencer/earnings/123
```

## 🚨 Important Notes

1. **Stripe Connect Required**: You must enable Connect in your Stripe Dashboard first
2. **Verification**: Influencers need to complete Stripe's verification process
3. **Payouts**: Commissions are automatically paid to influencer's bank account
4. **Fees**: Stripe charges standard processing fees on the full amount
5. **Taxes**: Influencers are responsible for their own tax reporting

## 🎉 Benefits

- **Automatic**: No manual commission calculations
- **Secure**: Stripe handles all payment processing
- **Compliant**: Meets financial regulations
- **Scalable**: Works for any number of influencers
- **Transparent**: Clear tracking of all transactions

## 🔄 Next Steps

1. **Enable Stripe Connect** in your dashboard
2. **Test the system** with the provided script
3. **Integrate with frontend** for influencer onboarding
4. **Add platform fees** if desired
5. **Set up webhooks** for real-time notifications

Once you enable Stripe Connect, the entire commission system will be fully functional! 🚀 