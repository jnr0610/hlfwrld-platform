require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
  console.log('🚀 Setting up Stripe products and prices...\n');

  try {
    // Create Basic Plan Product
    console.log('📦 Creating Basic Plan product...');
    const basicProduct = await stripe.products.create({
      name: 'Basic Plan',
      description: 'Up to 5 new client requests per month',
      metadata: {
        plan_type: 'basic',
        max_requests: '5'
      }
    });

    const basicPrice = await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 2900, // $29.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_type: 'basic'
      }
    });

    console.log(`✅ Basic Plan created:`);
    console.log(`   Product ID: ${basicProduct.id}`);
    console.log(`   Price ID: ${basicPrice.id}`);
    console.log(`   Price: $29/month\n`);

    // Create Professional Plan Product
    console.log('📦 Creating Professional Plan product...');
    const professionalProduct = await stripe.products.create({
      name: 'Professional Plan',
      description: 'Up to 100 new client requests per month',
      metadata: {
        plan_type: 'professional',
        max_requests: '100'
      }
    });

    const professionalPrice = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 8900, // $89.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_type: 'professional'
      }
    });

    console.log(`✅ Professional Plan created:`);
    console.log(`   Product ID: ${professionalProduct.id}`);
    console.log(`   Price ID: ${professionalPrice.id}`);
    console.log(`   Price: $89/month\n`);

    // Create Premium Plan Product
    console.log('📦 Creating Premium Plan product...');
    const premiumProduct = await stripe.products.create({
      name: 'Premium Plan',
      description: 'Unlimited new client requests per month',
      metadata: {
        plan_type: 'premium',
        max_requests: 'unlimited'
      }
    });

    const premiumPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 14900, // $149.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_type: 'premium'
      }
    });

    console.log(`✅ Premium Plan created:`);
    console.log(`   Product ID: ${premiumProduct.id}`);
    console.log(`   Price ID: ${premiumPrice.id}`);
    console.log(`   Price: $149/month\n`);

    // Update the backend code with the new price IDs
    console.log('📝 Price IDs to update in backend/index.js:');
    console.log('```javascript');
    console.log('const planPrices = {');
    console.log(`  'basic': '${basicPrice.id}',`);
    console.log(`  'professional': '${professionalPrice.id}',`);
    console.log(`  'premium': '${premiumPrice.id}'`);
    console.log('};');
    console.log('```\n');

    console.log('🎉 Stripe products and prices setup complete!');
    console.log('💡 Copy the price IDs above and update the backend/index.js file.');

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error.message);
    
    if (error.code === 'resource_missing') {
      console.log('💡 Make sure your STRIPE_SECRET_KEY is correct in .env file');
    }
  }
}

// Run the setup
setupStripeProducts(); 