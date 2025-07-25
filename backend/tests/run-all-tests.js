require('dotenv').config();

console.log('🧪 Booking System Test Suite');
console.log('============================\n');

const { exec } = require('child_process');
const path = require('path');

// Test configuration
const tests = {
  resend: {
    name: 'Resend Email Service',
    file: 'test-resend.js',
    description: 'Test email sending via Resend'
  },
  ses: {
    name: 'AWS SES Email Service',
    file: 'test-ses.js',
    description: 'Test email sending via AWS SES'
  },
  stripe: {
    name: 'Stripe Payment Service',
    file: 'test-stripe.js',
    description: 'Test Stripe payment integration'
  }
};

// Get command line arguments
const args = process.argv.slice(2);
const testToRun = args[0] || 'all';

function runTest(testName) {
  return new Promise((resolve, reject) => {
    const testFile = path.join(__dirname, tests[testName].file);
    
    console.log(`\n🚀 Running ${tests[testName].name}...`);
    console.log(`📝 ${tests[testName].description}`);
    console.log('─'.repeat(50));
    
    const child = exec(`node "${testFile}"`, {
      cwd: __dirname
    });
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${tests[testName].name} completed successfully!\n`);
        resolve();
      } else {
        console.log(`\n❌ ${tests[testName].name} failed with code ${code}\n`);
        reject(new Error(`Test ${testName} failed`));
      }
    });
    
    child.on('error', (error) => {
      console.log(`\n❌ Error running ${tests[testName].name}: ${error.message}\n`);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('📋 Available Tests:');
  Object.keys(tests).forEach(key => {
    console.log(`  • ${key}: ${tests[key].name}`);
  });
  
  console.log('\n📋 Environment Check:');
  console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'not set');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
  console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
  
  try {
    if (testToRun === 'all') {
      console.log('\n🎯 Running all tests...\n');
      
      for (const testName of Object.keys(tests)) {
        try {
          await runTest(testName);
        } catch (error) {
          console.log(`⚠️  Skipping ${tests[testName].name} due to error`);
        }
      }
      
      console.log('🎉 All tests completed!');
      
    } else if (tests[testToRun]) {
      await runTest(testToRun);
      console.log('🎉 Test completed!');
      
    } else {
      console.log(`\n❌ Unknown test: ${testToRun}`);
      console.log('Available tests:', Object.keys(tests).join(', '));
      console.log('Usage: node run-all-tests.js [test-name]');
      console.log('Examples:');
      console.log('  node run-all-tests.js          # Run all tests');
      console.log('  node run-all-tests.js resend   # Run only Resend test');
      console.log('  node run-all-tests.js ses      # Run only SES test');
      console.log('  node run-all-tests.js stripe   # Run only Stripe test');
    }
    
  } catch (error) {
    console.log('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Show usage if help is requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('🧪 Booking System Test Suite');
  console.log('============================\n');
  console.log('Usage: node run-all-tests.js [test-name]');
  console.log('\nAvailable tests:');
  Object.keys(tests).forEach(key => {
    console.log(`  ${key}: ${tests[key].description}`);
  });
  console.log('\nExamples:');
  console.log('  node run-all-tests.js          # Run all tests');
  console.log('  node run-all-tests.js resend   # Run only Resend test');
  console.log('  node run-all-tests.js ses      # Run only SES test');
  console.log('  node run-all-tests.js stripe   # Run only Stripe test');
  console.log('\nEnvironment Variables:');
  console.log('  RESEND_API_KEY: Your Resend API key');
  console.log('  AWS_ACCESS_KEY_ID: Your AWS access key');
  console.log('  AWS_SECRET_ACCESS_KEY: Your AWS secret key');
  console.log('  STRIPE_SECRET_KEY: Your Stripe secret key');
  process.exit(0);
}

// Run the tests
runAllTests().catch(console.error); 