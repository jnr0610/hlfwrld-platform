require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeConnection() {
    try {
        console.log('🔗 Testing Stripe connection...');
        
        // Test 1: Check if we can create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 1000, // $10.00
            currency: 'usd',
            description: 'Test payment'
        });
        
        console.log('✅ Stripe connection successful!');
        console.log('💰 Test payment intent created:', paymentIntent.id);
        console.log('📊 Account status: Connected');
        
        // Test 2: Get account details
        const account = await stripe.accounts.retrieve();
        console.log('🏢 Account ID:', account.id);
        console.log('📧 Account email:', account.email);
        
    } catch (error) {
        console.error('❌ Stripe connection failed:', error.message);
        console.log('💡 Make sure your STRIPE_SECRET_KEY is correct in .env file');
    }
}

testStripeConnection(); 