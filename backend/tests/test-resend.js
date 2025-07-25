require('dotenv').config();
const { Resend } = require('resend');

// Initialize Resend
let resend;
try {
  resend = new Resend(process.env.RESEND_API_KEY);
} catch (error) {
  console.log('⚠️  Resend not configured - will show configuration instructions');
  resend = null;
}

async function testResend() {
  console.log('🧪 Testing Resend Email Configuration...');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || '❌ Missing');
  console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'resend');
  
  if (!process.env.RESEND_API_KEY) {
    console.log('\n❌ ERROR: RESEND_API_KEY not found in .env file');
    console.log('Please add your Resend API key to backend/.env:');
    console.log('RESEND_API_KEY=re_your_api_key_here');
    console.log('RESEND_FROM_EMAIL=noreply@yourdomain.com');
    console.log('EMAIL_SERVICE=resend');
    return;
  }
  
  if (!process.env.RESEND_FROM_EMAIL) {
    console.log('\n❌ ERROR: RESEND_FROM_EMAIL not set');
    console.log('Please add your from email to backend/.env:');
    console.log('RESEND_FROM_EMAIL=noreply@yourdomain.com');
    return;
  }
  
  if (!resend) {
    console.log('\n❌ ERROR: Resend not properly configured');
    console.log('Please check your RESEND_API_KEY in backend/.env');
    return;
  }
  
  try {
    // Test Resend configuration
    console.log('\n📧 Testing Resend Configuration...');
    
    const testEmail = process.env.RESEND_FROM_EMAIL; // Send to yourself for testing
    
    const emailData = {
      from: process.env.RESEND_FROM_EMAIL,
      to: [testEmail],
      subject: '🧪 Resend Test - Salon Booking System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello! 👋</h2>
          
          <p>This is a test email from your salon booking system's <strong>Resend</strong> integration.</p>
          
          <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0066cc; margin-top: 0;">✅ Success!</h3>
            <p>If you receive this email, your Resend setup is working correctly!</p>
          </div>
          
          <h3>Setup Details:</h3>
          <ul>
            <li><strong>From Email:</strong> ${process.env.RESEND_FROM_EMAIL}</li>
            <li><strong>To Email:</strong> ${testEmail}</li>
            <li><strong>Service:</strong> Resend</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
          
          <p>Your salon booking system is now ready to send real emails to clients!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            Your Booking System Team
          </p>
        </div>
      `,
      text: `Hello!

This is a test email from your salon booking system's Resend integration.

✅ If you receive this email, your Resend setup is working correctly!

Setup Details:
- From Email: ${process.env.RESEND_FROM_EMAIL}
- To Email: ${testEmail}
- Service: Resend
- Timestamp: ${new Date().toISOString()}

Your salon booking system is now ready to send real emails to clients!

Best regards,
Your Booking System Team`
    };
    
    console.log('📤 Sending test email...');
    console.log('From:', emailData.from);
    console.log('To:', emailData.to[0]);
    
    const result = await resend.emails.send(emailData);
    
    console.log('✅ SUCCESS! Test email sent successfully!');
    console.log('Message ID:', result.id);
    console.log('Check your email inbox for the test message.');
    
    // Test email sending with different content types
    console.log('\n🧪 Testing different email formats...');
    
    // Test simple text email
    const textResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [testEmail],
      subject: '📝 Resend Text Email Test',
      text: 'This is a simple text email test from Resend.'
    });
    
    console.log('✅ Text email sent successfully! ID:', textResult.id);
    
    // Test HTML email with attachments (simulated)
    const htmlResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [testEmail],
      subject: '🎨 Resend HTML Email Test',
      html: `
        <h1 style="color: #0066cc;">HTML Email Test</h1>
        <p>This is an <strong>HTML formatted</strong> email test.</p>
        <ul>
          <li>Feature 1: ✅ HTML formatting</li>
          <li>Feature 2: ✅ Styling support</li>
          <li>Feature 3: ✅ Professional appearance</li>
        </ul>
      `
    });
    
    console.log('✅ HTML email sent successfully! ID:', htmlResult.id);
    
    console.log('\n🎉 All Resend tests completed successfully!');
    console.log('Your email system is ready for production use.');
    
  } catch (error) {
    console.log('\n❌ ERROR: Failed to send test email');
    console.log('Error:', error.message);
    
    if (error.statusCode === 401) {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Check your RESEND_API_KEY in .env file');
      console.log('2. Make sure your API key is valid and active');
      console.log('3. Verify your Resend account is in good standing');
    } else if (error.statusCode === 422) {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Check your RESEND_FROM_EMAIL format');
      console.log('2. Make sure the email address is valid');
      console.log('3. Verify your domain is properly configured in Resend');
    } else if (error.statusCode === 429) {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. You have exceeded your email sending limits');
      console.log('2. Check your Resend account usage');
      console.log('3. Consider upgrading your plan if needed');
    } else {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Check your internet connection');
      console.log('2. Verify your Resend account status');
      console.log('3. Check Resend service status at https://status.resend.com');
    }
  }
}

// Run the test
testResend().catch(console.error); 