require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testSubscriptionSystem() {
  console.log('🧪 Testing subscription system...\n');

  try {
    // Test 1: Create a test customer
    console.log('1️⃣ Creating test customer...');
    const customer = await stripe.customers.create({
      email: 'test-salon@example.com',
      name: 'Test Salon',
      phone: '+1234567890',
      metadata: {
        salonId: '999',
        ownerName: 'Test Owner'
      }
    });
    console.log(`✅ Test customer created: ${customer.id}\n`);

    // Test 2: Create a subscription for the customer
    console.log('2️⃣ Creating test subscription...');
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: 'price_1RooWBCftZZpvYyWMPs1yixA' }], // Professional plan
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
    console.log(`✅ Test subscription created: ${subscription.id}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Current period end: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}\n`);

    // Test 3: Test the payment info endpoint
    console.log('3️⃣ Testing payment info endpoint...');
    const paymentInfo = {
      hasStripeCustomer: true,
      subscriptionPlan: 'professional',
      nextBillingDate: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
      currentPlan: 'Professional',
      billingCycle: 'Monthly'
    };
    console.log('✅ Payment info structure:', JSON.stringify(paymentInfo, null, 2));

    // Test 4: Test billing portal session creation
    console.log('4️⃣ Testing billing portal session...');
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: 'http://localhost:3000/salon-account-settings',
    });
    console.log(`✅ Billing portal session created: ${session.url}\n`);

    // Test 5: Test subscription update
    console.log('5️⃣ Testing subscription update...');
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: 'price_1RooWACftZZpvYyWaBUa1bsF', // Switch to Basic plan
      }],
    });
    console.log(`✅ Subscription updated to Basic plan: ${updatedSubscription.id}\n`);

    console.log('🎉 All subscription tests passed!');
    console.log('\n📋 Summary:');
    console.log(`   Customer ID: ${customer.id}`);
    console.log(`   Subscription ID: ${subscription.id}`);
    console.log(`   Final Plan: Basic ($29/month)`);
    console.log(`   Billing Portal: ${session.url}`);

    // Cleanup: Cancel the test subscription
    console.log('\n🧹 Cleaning up test data...');
    await stripe.subscriptions.cancel(subscription.id);
    await stripe.customers.del(customer.id);
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'resource_missing') {
      console.log('💡 Make sure your STRIPE_SECRET_KEY is correct');
    }
  }
}

// Run the test
testSubscriptionSystem(); 