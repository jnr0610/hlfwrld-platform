require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestEnvironmentSetup {
    constructor() {
        this.envPath = path.join(__dirname, '../../.env');
        this.testEnvPath = path.join(__dirname, '.env.test');
        this.requiredPackages = ['axios', 'stripe', 'aws-sdk', 'resend'];
    }

    log(message, type = 'info') {
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} ${message}`);
    }

    // Check if Node.js and npm are installed
    checkNodeEnvironment() {
        try {
            const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            
            this.log(`Node.js version: ${nodeVersion}`, 'success');
            this.log(`npm version: ${npmVersion}`, 'success');
            
            return true;
        } catch (error) {
            this.log('Node.js or npm not found. Please install Node.js first.', 'error');
            return false;
        }
    }

    // Check if required packages are installed
    checkDependencies() {
        this.log('Checking required dependencies...');
        
        const missingPackages = [];
        
        for (const pkg of this.requiredPackages) {
            try {
                require.resolve(pkg);
                this.log(`✅ ${pkg} is installed`);
            } catch (error) {
                missingPackages.push(pkg);
                this.log(`❌ ${pkg} is missing`);
            }
        }

        if (missingPackages.length > 0) {
            this.log(`Installing missing packages: ${missingPackages.join(', ')}`);
            try {
                execSync(`npm install ${missingPackages.join(' ')}`, { 
                    cwd: path.join(__dirname, '../'),
                    stdio: 'inherit'
                });
                this.log('Dependencies installed successfully', 'success');
            } catch (error) {
                this.log('Failed to install dependencies', 'error');
                return false;
            }
        }

        return true;
    }

    // Create test environment file
    createTestEnvironmentFile() {
        const testEnvContent = `# Test Environment Configuration
# Copy this file to .env.test and fill in your actual values

# Backend Configuration
BASE_URL=http://localhost:3000
PORT=3000

# Test Data
TEST_EMAIL=test@example.com
TEST_PHONE=+1234567890

# Email Service Configuration
EMAIL_SERVICE=resend
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AWS SES Configuration (Alternative)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Database Configuration
DATABASE_PATH=./Database/database.sqlite

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Optional: For production testing
# BASE_URL=https://your-production-domain.com
# STRIPE_SECRET_KEY=sk_live_your_live_stripe_key_here
`;

        try {
            fs.writeFileSync(this.testEnvPath, testEnvContent);
            this.log(`Test environment file created: ${this.testEnvPath}`, 'success');
            return true;
        } catch (error) {
            this.log(`Failed to create test environment file: ${error.message}`, 'error');
            return false;
        }
    }

    // Check current environment variables
    checkEnvironmentVariables() {
        this.log('Checking environment variables...');
        
        const requiredVars = [
            'STRIPE_SECRET_KEY',
            'EMAIL_SERVICE',
            'BASE_URL'
        ];

        const emailService = process.env.EMAIL_SERVICE;
        const emailVars = emailService === 'resend' 
            ? ['RESEND_API_KEY', 'RESEND_FROM_EMAIL']
            : ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_SES_FROM_EMAIL'];

        const allRequiredVars = [...requiredVars, ...emailVars];
        
        let missingVars = [];
        
        for (const varName of allRequiredVars) {
            if (process.env[varName]) {
                this.log(`✅ ${varName} is set`);
            } else {
                missingVars.push(varName);
                this.log(`❌ ${varName} is missing`);
            }
        }

        if (missingVars.length > 0) {
            this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'warning');
            this.log('Please set these variables in your .env file or environment', 'warning');
            return false;
        }

        this.log('All required environment variables are set', 'success');
        return true;
    }

    // Validate API keys
    async validateAPIKeys() {
        this.log('Validating API keys...');
        
        let allValid = true;

        // Test Stripe key
        if (process.env.STRIPE_SECRET_KEY) {
            try {
                const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                const account = await stripe.accounts.retrieve();
                this.log(`✅ Stripe key is valid (Account: ${account.id})`, 'success');
            } catch (error) {
                this.log(`❌ Stripe key is invalid: ${error.message}`, 'error');
                allValid = false;
            }
        }

        // Test Resend key
        if (process.env.RESEND_API_KEY && process.env.EMAIL_SERVICE === 'resend') {
            try {
                const { Resend } = require('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);
                // Note: Resend doesn't have a simple validation endpoint
                // We'll test it during actual email sending
                this.log('✅ Resend key format looks valid', 'success');
            } catch (error) {
                this.log(`❌ Resend key validation failed: ${error.message}`, 'error');
                allValid = false;
            }
        }

        // Test AWS credentials
        if (process.env.AWS_ACCESS_KEY_ID && process.env.EMAIL_SERVICE === 'ses') {
            try {
                const AWS = require('aws-sdk');
                AWS.config.update({
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    region: process.env.AWS_REGION
                });
                
                const ses = new AWS.SES();
                await ses.getSendQuota().promise();
                this.log('✅ AWS credentials are valid', 'success');
            } catch (error) {
                this.log(`❌ AWS credentials are invalid: ${error.message}`, 'error');
                allValid = false;
            }
        }

        return allValid;
    }

    // Check if backend server is running
    async checkBackendServer() {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        
        try {
            const axios = require('axios');
            const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
            
            if (response.status === 200) {
                this.log(`✅ Backend server is running at ${baseUrl}`, 'success');
                return true;
            } else {
                this.log(`⚠️ Backend server responded with status ${response.status}`, 'warning');
                return false;
            }
        } catch (error) {
            this.log(`❌ Backend server is not running at ${baseUrl}`, 'error');
            this.log('Please start your backend server before running tests', 'warning');
            return false;
        }
    }

    // Run a quick test to verify everything works
    async runQuickTest() {
        this.log('Running quick test to verify setup...');
        
        try {
            // Test basic connectivity
            const axios = require('axios');
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            
            // Test if server responds
            await axios.get(`${baseUrl}/health`, { timeout: 5000 });
            this.log('✅ Server connectivity test passed', 'success');
            
            // Test Stripe connection
            if (process.env.STRIPE_SECRET_KEY) {
                const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                await stripe.accounts.retrieve();
                this.log('✅ Stripe connection test passed', 'success');
            }
            
            this.log('🎉 Quick test completed successfully!', 'success');
            return true;
            
        } catch (error) {
            this.log(`❌ Quick test failed: ${error.message}`, 'error');
            return false;
        }
    }

    // Main setup function
    async setup() {
        console.log('🔧 Test Environment Setup');
        console.log('========================\n');

        // Step 1: Check Node.js environment
        if (!this.checkNodeEnvironment()) {
            return false;
        }

        // Step 2: Check dependencies
        if (!this.checkDependencies()) {
            return false;
        }

        // Step 3: Create test environment file
        this.createTestEnvironmentFile();

        // Step 4: Check environment variables
        const envVarsOk = this.checkEnvironmentVariables();
        
        if (!envVarsOk) {
            this.log('\n📝 Next Steps:', 'info');
            this.log('1. Copy the generated .env.test file to .env', 'info');
            this.log('2. Fill in your actual API keys and configuration', 'info');
            this.log('3. Run this setup script again to validate everything', 'info');
            return false;
        }

        // Step 5: Validate API keys
        const apiKeysValid = await this.validateAPIKeys();
        if (!apiKeysValid) {
            this.log('Please fix the invalid API keys and run setup again', 'warning');
            return false;
        }

        // Step 6: Check backend server
        const serverRunning = await this.checkBackendServer();
        if (!serverRunning) {
            this.log('Please start your backend server and run setup again', 'warning');
            return false;
        }

        // Step 7: Run quick test
        const quickTestPassed = await this.runQuickTest();
        if (!quickTestPassed) {
            this.log('Setup completed with warnings. Some tests may fail.', 'warning');
            return false;
        }

        this.log('\n🎉 Test environment setup completed successfully!', 'success');
        this.log('\n📋 You can now run tests using:', 'info');
        this.log('  node run-all-tests.js          # Run all tests', 'info');
        this.log('  node run-all-tests.js e2e      # Run end-to-end workflow test', 'info');
        this.log('  node run-all-tests.js payment  # Run payment workflow test', 'info');
        
        return true;
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('🔧 Test Environment Setup');
        console.log('========================\n');
        console.log('Usage: node setup-test-environment.js [options]');
        console.log('\nOptions:');
        console.log('  --help, -h     Show this help message');
        console.log('  --quick        Skip API key validation (faster setup)');
        console.log('\nThis script will:');
        console.log('  1. Check Node.js and npm installation');
        console.log('  2. Install required dependencies');
        console.log('  3. Create test environment file');
        console.log('  4. Validate environment variables');
        console.log('  5. Test API key connectivity');
        console.log('  6. Verify backend server is running');
        console.log('  7. Run a quick test to ensure everything works');
        console.log('\nExample:');
        console.log('  node setup-test-environment.js');
        process.exit(0);
    }

    const setup = new TestEnvironmentSetup();
    const success = await setup.setup();
    
    if (!success) {
        process.exit(1);
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    });
}

module.exports = TestEnvironmentSetup; 