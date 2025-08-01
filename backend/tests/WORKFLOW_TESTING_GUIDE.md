# 🧪 Complete Workflow Testing Guide

This guide explains how to test the entire booking system workflow from user signup to payment completion.

## 📋 Overview

The booking system workflow consists of these main steps:

1. **Creator Signup** - Influencers/creators register for the platform
2. **Salon Signup** - Salons register for the platform  
3. **Service Post Creation** - Creators post services they offer
4. **Client Booking Request** - Clients request appointments
5. **Salon Time Options** - Salons send available time slots
6. **Client Time Selection** - Clients select their preferred time
7. **Payment Processing** - Payment is processed via Stripe
8. **Email Notifications** - Confirmation emails are sent
9. **Database Verification** - All data is properly stored

## 🚀 Quick Start

### 1. Setup Test Environment

```bash
cd backend/tests
node setup-test-environment.js
```

This will:
- Check your Node.js installation
- Install required dependencies
- Create a test environment file
- Validate your API keys
- Test connectivity

### 2. Run Complete Workflow Test

```bash
# Run the full end-to-end workflow test
node run-all-tests.js e2e

# Or run just the payment workflow test
node run-all-tests.js payment
```

### 3. Run All Tests

```bash
# Run all available tests
node run-all-tests.js
```

## 📁 Test Files

### **End-to-End Workflow Test** (`test-end-to-end-workflow.js`)
Tests the complete user journey from signup to payment.

**What it tests:**
- ✅ Creator and salon signup
- ✅ Service post creation
- ✅ Client booking requests
- ✅ Time slot management
- ✅ Payment processing
- ✅ Email notifications
- ✅ Database state verification

### **Payment Workflow Test** (`test-payment-workflow.js`)
Specialized test for payment processing with Stripe test cards.

**What it tests:**
- ✅ Stripe connection and API keys
- ✅ Payment intent creation
- ✅ Successful payments
- ✅ Declined payments
- ✅ Insufficient funds scenarios
- ✅ Expired card handling
- ✅ Refund processing
- ✅ Checkout session creation
- ✅ Webhook handling

### **Individual Service Tests**
- `test-resend.js` - Email service via Resend
- `test-ses.js` - Email service via AWS SES
- `test-stripe.js` - Basic Stripe integration

## 🔧 Environment Setup

### Required Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Backend Configuration
BASE_URL=http://localhost:3000
PORT=3000

# Test Data
TEST_EMAIL=test@example.com
TEST_PHONE=+1234567890

# Email Service (Choose one)
EMAIL_SERVICE=resend
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# OR for AWS SES
# EMAIL_SERVICE=ses
# AWS_ACCESS_KEY_ID=your_aws_access_key_here
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
# AWS_REGION=us-east-1
# AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Database Configuration
DATABASE_PATH=./Database/database.sqlite

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
```

### API Key Setup

#### Stripe Setup
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your test API keys from the Stripe Dashboard
3. Use test keys for development (start with `sk_test_`)

#### Resend Setup (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Verify your domain for sending emails

#### AWS SES Setup (Alternative)
1. Create an AWS account
2. Set up SES in your preferred region
3. Verify your email addresses
4. Get your access keys

## 🧪 Running Tests

### Test Commands

```bash
# Setup environment first
node setup-test-environment.js

# Run specific tests
node run-all-tests.js e2e          # End-to-end workflow
node run-all-tests.js payment      # Payment workflow
node run-all-tests.js resend       # Email service
node run-all-tests.js stripe       # Basic Stripe test

# Run all tests
node run-all-tests.js

# Get help
node run-all-tests.js --help
```

### Test Output

Successful test output looks like:

```
🧪 End-to-End Workflow Test
==========================
ℹ️ [2024-01-15T10:30:00.000Z] Starting: Creator Signup
✅ [2024-01-15T10:30:01.000Z] Completed: Creator Signup
ℹ️ [2024-01-15T10:30:01.000Z] Starting: Salon Signup
✅ [2024-01-15T10:30:02.000Z] Completed: Salon Signup
...

📊 Test Summary
==============
Total Steps: 11
✅ Passed: 11
❌ Failed: 0
📈 Success Rate: 100.0%
```

## 💳 Payment Testing

### Test Card Numbers

The payment workflow test uses these Stripe test cards:

| Scenario | Card Number | Expected Result |
|----------|-------------|-----------------|
| Success | `4242424242424242` | Payment succeeds |
| Declined | `4000000000000002` | Payment declined |
| Insufficient Funds | `4000000000009995` | Insufficient funds error |
| Expired | `4000000000000069` | Expired card error |

### Payment Test Scenarios

1. **Successful Payment**
   - Creates payment intent
   - Confirms with valid test card
   - Verifies payment success

2. **Declined Payment**
   - Tests declined card handling
   - Verifies proper error responses

3. **Insufficient Funds**
   - Tests insufficient funds scenario
   - Verifies error handling

4. **Expired Card**
   - Tests expired card detection
   - Verifies validation

5. **Refund Processing**
   - Creates successful payment
   - Processes refund
   - Verifies refund status

## 📧 Email Testing

### Email Test Scenarios

1. **Booking Request Email**
   - Sent to salon when client requests booking
   - Contains client details and service information

2. **Time Options Email**
   - Sent to client with available time slots
   - Contains secure link for time selection

3. **Appointment Confirmation**
   - Sent to client after time selection
   - Contains appointment details and payment link

4. **Payment Confirmation**
   - Sent after successful payment
   - Contains booking confirmation and details

### Email Service Options

#### Resend (Recommended)
- Faster setup
- Better deliverability
- Simple API
- Free tier available

#### AWS SES (Alternative)
- More complex setup
- Requires AWS account
- Good for high volume
- Cost-effective for large scale

## 🔍 Troubleshooting

### Common Issues

#### Backend Server Not Running
```
❌ Backend server is not running at http://localhost:3000
```
**Solution:** Start your backend server first
```bash
cd backend
node index.js
```

#### Invalid API Keys
```
❌ Stripe key is invalid: Invalid API key provided
```
**Solution:** Check your API keys in the `.env` file

#### Missing Dependencies
```
❌ axios is missing
```
**Solution:** Run the setup script
```bash
node setup-test-environment.js
```

#### Email Not Sending
```
❌ Email sending failed: 401 Unauthorized
```
**Solution:** 
- Check your email service API key
- Verify your domain is configured
- Check email service status

#### Payment Declined Unexpectedly
```
❌ Payment should have been declined but was not
```
**Solution:** 
- Ensure you're using test cards
- Check Stripe test mode is enabled
- Verify API key is test key

### Debug Mode

Run tests with verbose output:

```bash
node test-end-to-end-workflow.js --verbose
```

### Manual Testing

For manual testing of specific endpoints:

```bash
# Test creator signup
curl -X POST http://localhost:3000/api/creators/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Creator",
    "email": "test@example.com",
    "phone": "+1234567890",
    "zipCode": "12345",
    "instagram": "@testcreator",
    "username": "testcreator",
    "password": "TestPassword123!"
  }'
```

## 📊 Test Results Interpretation

### Success Indicators
- ✅ All steps complete without errors
- ✅ Database records created correctly
- ✅ Emails sent successfully
- ✅ Payments processed correctly
- ✅ All API responses are 200/201

### Warning Signs
- ⚠️ Some steps skipped due to configuration
- ⚠️ Non-critical errors (e.g., email delivery delays)
- ⚠️ Partial test completion

### Failure Indicators
- ❌ API endpoints not responding
- ❌ Database connection issues
- ❌ Invalid API keys
- ❌ Payment processing failures
- ❌ Email service errors

## 🚀 Production Testing

### Before Going Live

1. **Run Complete Test Suite**
   ```bash
   node run-all-tests.js
   ```

2. **Test with Real Data**
   - Use real email addresses
   - Test with small amounts
   - Verify all notifications

3. **Load Testing**
   - Test with multiple concurrent users
   - Verify database performance
   - Check email delivery rates

4. **Security Testing**
   - Test authentication flows
   - Verify data validation
   - Check payment security

### Production Checklist

- [ ] All tests pass
- [ ] Environment variables configured
- [ ] API keys are production keys
- [ ] Database is properly set up
- [ ] Email service is configured
- [ ] Payment processing works
- [ ] Error handling is tested
- [ ] Monitoring is in place

## 📝 Adding New Tests

### Creating Custom Tests

1. Create a new test file: `test-your-feature.js`
2. Follow the existing test structure
3. Add to the test configuration in `run-all-tests.js`
4. Update this documentation

### Test Structure Template

```javascript
require('dotenv').config();

class YourFeatureTest {
    constructor() {
        this.testResults = [];
    }

    log(message, type = 'info') {
        // Logging implementation
    }

    async testStep(stepName, testFunction) {
        // Step testing implementation
    }

    async runTests() {
        // Your test implementation
    }
}

module.exports = YourFeatureTest;
```

## 🆘 Getting Help

### Documentation
- Check the main `README.md` in the tests folder
- Review service-specific setup guides
- Check API documentation for external services

### Common Resources
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Resend Documentation](https://resend.com/docs)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)

### Support
- Check error messages for specific issues
- Verify environment configuration
- Test individual components separately
- Use debug mode for detailed output

---

**Happy Testing! 🎉**

This testing framework ensures your booking system works correctly across all scenarios before going live. 