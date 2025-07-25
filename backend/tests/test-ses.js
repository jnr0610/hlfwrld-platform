require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS SES
const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function testSES() {
  console.log('🧪 Testing AWS SES Configuration...');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('AWS_REGION:', process.env.AWS_REGION || 'us-east-1');
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
  console.log('AWS_SES_FROM_EMAIL:', process.env.AWS_SES_FROM_EMAIL || '❌ Missing');
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('\n❌ ERROR: AWS credentials not found in .env file');
    console.log('Please add your AWS credentials to backend/.env:');
    console.log('AWS_ACCESS_KEY_ID=your_access_key_here');
    console.log('AWS_SECRET_ACCESS_KEY=your_secret_key_here');
    console.log('AWS_SES_FROM_EMAIL=your-verified-email@gmail.com');
    return;
  }
  
  if (!process.env.AWS_SES_FROM_EMAIL) {
    console.log('\n❌ ERROR: AWS_SES_FROM_EMAIL not set');
    console.log('Please add your verified email to backend/.env:');
    console.log('AWS_SES_FROM_EMAIL=your-verified-email@gmail.com');
    return;
  }
  
  try {
    // Test SES configuration
    console.log('\n📧 Testing SES Configuration...');
    
    const params = {
      Source: process.env.AWS_SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [process.env.AWS_SES_FROM_EMAIL] // Send to yourself for testing
      },
      Message: {
        Subject: {
          Data: '🧪 AWS SES Test - Salon Booking System',
          Charset: 'UTF-8'
        },
        Body: {
          Text: {
            Data: `Hello!

This is a test email from your salon booking system's AWS SES integration.

✅ If you receive this email, your AWS SES setup is working correctly!

Setup Details:
- Region: ${process.env.AWS_REGION || 'us-east-1'}
- From Email: ${process.env.AWS_SES_FROM_EMAIL}
- Timestamp: ${new Date().toISOString()}

Your salon booking system is now ready to send real emails to clients!

Best regards,
Your Booking System
            `,
            Charset: 'UTF-8'
          }
        }
      }
    };
    
    console.log('📤 Sending test email...');
    const result = await ses.sendEmail(params).promise();
    
    console.log('✅ SUCCESS! Test email sent successfully!');
    console.log('Message ID:', result.MessageId);
    console.log('Check your email inbox for the test message.');
    
  } catch (error) {
    console.log('\n❌ ERROR: Failed to send test email');
    console.log('Error:', error.message);
    
    if (error.code === 'MessageRejected') {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Make sure your email is verified in AWS SES');
      console.log('2. In sandbox mode, you can only send to verified emails');
      console.log('3. Go to AWS SES Console → Email Addresses to verify your email');
    } else if (error.code === 'AccessDenied') {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Check your AWS credentials in .env file');
      console.log('2. Make sure your IAM user has SES permissions');
      console.log('3. Verify your AWS region is correct');
    }
  }
}

// Run the test
testSES().catch(console.error); 