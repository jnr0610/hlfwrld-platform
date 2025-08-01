# 🧪 Booking System Test Suite

This folder contains comprehensive tests for all external services and complete workflow testing for the booking system.

## 📁 Test Files

### **🔄 Workflow Tests**
- **`test-end-to-end-workflow.js`** - Complete user journey from signup to payment
- **`test-payment-workflow.js`** - Comprehensive payment processing with Stripe test cards

### **📧 Email Service Tests**
- **`test-resend.js`** - Test Resend email service (currently active)
- **`test-ses.js`** - Test AWS SES email service (backup option)

### **💳 Payment Service Tests**
- **`test-stripe.js`** - Test Stripe payment integration

### **🚀 Test Runner & Setup**
- **`run-all-tests.js`** - Master test runner for all services
- **`setup-test-environment.js`** - Automated test environment setup
- **`quick-start.sh`** - Quick setup script for immediate testing

## 🚀 Quick Start

### Quick Setup
```bash
cd backend/tests
./quick-start.sh
```

### Run All Tests
```bash
cd backend/tests
node run-all-tests.js
```

### Run Specific Tests
```bash
# Test complete workflow
node run-all-tests.js e2e

# Test payment processing
node run-all-tests.js payment

# Test only Resend email service
node run-all-tests.js resend

# Test only AWS SES email service
node run-all-tests.js ses

# Test only Stripe payment service
node run-all-tests.js stripe
```

### Get Help
```bash
node run-all-tests.js --help
```

## 📋 Environment Variables Required

### For Complete Workflow Testing
```bash
BASE_URL=http://localhost:3000
TEST_EMAIL=test@example.com
TEST_PHONE=+1234567890
```

### For Resend (Currently Active)
```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
EMAIL_SERVICE=resend
```

### For AWS SES (Backup)
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
EMAIL_SERVICE=ses
```

### For Stripe
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

## 🧪 Individual Test Usage

### Test Resend Email Service
```bash
cd backend/tests
node test-resend.js
```

**What it tests:**
- ✅ Environment variable configuration
- ✅ API key validity
- ✅ Email sending functionality
- ✅ HTML and text email formats
- ✅ Error handling and troubleshooting

### Test AWS SES Email Service
```bash
cd backend/tests
node test-ses.js
```

**What it tests:**
- ✅ AWS credentials configuration
- ✅ SES permissions and setup
- ✅ Email verification status
- ✅ Email delivery functionality

### Test Stripe Payment Service
```bash
cd backend/tests
node test-stripe.js
```

**What it tests:**
- ✅ Stripe API key configuration
- ✅ Payment processing capabilities
- ✅ Webhook handling
- ✅ Error scenarios

## 🎯 When to Run Tests

### **Complete Workflow Testing**
- **Before Going Live** - Run `node run-all-tests.js e2e` to test the entire user journey
- **After Major Changes** - Test the complete flow after significant updates
- **Payment Testing** - Run `node run-all-tests.js payment` to test all payment scenarios

### **Before Going Live**
- Run all tests to ensure everything works
- Verify email delivery to real addresses
- Test payment processing with test cards

### **After Configuration Changes**
- When updating API keys
- When switching email services
- When modifying payment settings

### **Debugging Issues**
- When emails aren't sending
- When payments are failing
- When services aren't responding

## 📊 Test Results

### ✅ Success Indicators
- **Resend**: "SUCCESS! Test email sent successfully!"
- **SES**: "SUCCESS! Test email sent successfully!"
- **Stripe**: "Stripe connection successful!"

### ❌ Common Issues & Solutions

#### Resend Issues
- **401 Error**: Check API key validity
- **422 Error**: Verify email format and domain
- **429 Error**: Check sending limits

#### SES Issues
- **MessageRejected**: Verify email addresses
- **AccessDenied**: Check AWS credentials and permissions

#### Stripe Issues
- **Invalid API Key**: Verify secret key format
- **Authentication Error**: Check key permissions

## 🔧 Troubleshooting

### Email Not Sending
1. Check environment variables in `.env`
2. Verify API keys are valid
3. Check service status pages
4. Review error messages for specific issues

### Payment Issues
1. Ensure using test keys for development
2. Check Stripe dashboard for errors
3. Verify webhook endpoints
4. Test with Stripe test cards

### General Issues
1. Check internet connection
2. Verify service accounts are active
3. Review service-specific error codes
4. Check rate limits and quotas

## 📝 Adding New Tests

To add a new service test:

1. Create `test-[service].js` file
2. Add service configuration to `run-all-tests.js`
3. Update this README with new service details
4. Test the new service thoroughly

## 🎉 Success Checklist

Before deploying to production, ensure:

- [ ] Complete workflow test passes (`node run-all-tests.js e2e`)
- [ ] Payment workflow test passes (`node run-all-tests.js payment`)
- [ ] All email tests pass
- [ ] Payment tests complete successfully
- [ ] Error handling works correctly
- [ ] Environment variables are properly set
- [ ] Service accounts are in good standing
- [ ] Rate limits are sufficient for expected usage

## 📚 Additional Documentation

- **`WORKFLOW_TESTING_GUIDE.md`** - Comprehensive guide for testing the complete workflow
- **`setup-test-environment.js`** - Automated environment setup and validation
- **`quick-start.sh`** - One-command setup for immediate testing

---

**Need help?** Check the main documentation folder for detailed setup guides for each service. 