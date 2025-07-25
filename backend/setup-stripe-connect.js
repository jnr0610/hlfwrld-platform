require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupStripeConnect() {
  console.log('🔗 Setting up Stripe Connect for influencer commissions...\n');

  try {
    // Test 1: Create a test connected account (influencer)
    console.log('1️⃣ Creating test connected account for influencer...');
    const connectedAccount = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: 'test-influencer@example.com',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        url: 'https://hlfwrld.com',
        mcc: '7299', // Personal Care Services
      },
    });
    console.log(`✅ Connected account created: ${connectedAccount.id}\n`);

    // Test 2: Create a test payment intent with application fee
    console.log('2️⃣ Testing payment with commission split...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 10000, // $100.00
      currency: 'usd',
      application_fee_amount: 1500, // 15% commission = $15.00
      transfer_data: {
        destination: connectedAccount.id,
      },
      metadata: {
        influencerId: 'test_influencer_123',
        commissionRate: '15%',
        serviceType: 'beauty_booking'
      }
    });
    console.log(`✅ Payment intent created: ${paymentIntent.id}`);
    console.log(`   Amount: $100.00`);
    console.log(`   Commission: $15.00 (15%)`);
    console.log(`   Influencer receives: $85.00\n`);

    // Test 3: Create a checkout session with commission
    console.log('3️⃣ Testing checkout session with commission...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Beauty Service Booking',
            description: 'Service booked through influencer',
          },
          unit_amount: 10000, // $100.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:3000/booking-success',
      cancel_url: 'http://localhost:3000/salon-dashboard',
      payment_intent_data: {
        application_fee_amount: 1500, // 15% commission
        transfer_data: {
          destination: connectedAccount.id,
        },
        metadata: {
          influencerId: 'test_influencer_123',
          commissionRate: '15%',
          serviceType: 'beauty_booking'
        }
      }
    });
    console.log(`✅ Checkout session created: ${session.url}\n`);

    // Test 4: Create a transfer to the connected account
    console.log('4️⃣ Testing transfer to influencer...');
    const transfer = await stripe.transfers.create({
      amount: 8500, // $85.00 (after commission)
      currency: 'usd',
      destination: connectedAccount.id,
      description: 'Commission payment for beauty service booking',
      metadata: {
        influencerId: 'test_influencer_123',
        bookingId: 'test_booking_456',
        commissionRate: '15%'
      }
    });
    console.log(`✅ Transfer created: ${transfer.id}`);
    console.log(`   Amount transferred: $85.00\n`);

    console.log('🎉 Stripe Connect setup complete!');
    console.log('\n📋 Summary:');
    console.log(`   Connected Account ID: ${connectedAccount.id}`);
    console.log(`   Payment Intent ID: ${paymentIntent.id}`);
    console.log(`   Checkout Session: ${session.url}`);
    console.log(`   Transfer ID: ${transfer.id}`);

    // Cleanup: Delete the test connected account
    console.log('\n🧹 Cleaning up test data...');
    await stripe.accounts.del(connectedAccount.id);
    console.log('✅ Test connected account deleted');

  } catch (error) {
    console.error('❌ Error setting up Stripe Connect:', error.message);
    
    if (error.code === 'resource_missing') {
      console.log('💡 Make sure your STRIPE_SECRET_KEY is correct');
    }
  }
}

// Run the setup
setupStripeConnect(); 