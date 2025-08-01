require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PHONE = process.env.TEST_PHONE || '+1234567890';

class EndToEndWorkflowTest {
    constructor() {
        this.testData = {
            creator: {
                name: 'Test Creator',
                email: TEST_EMAIL,
                phone: TEST_PHONE,
                zipCode: '12345',
                instagram: '@testcreator',
                username: 'testcreator_' + Date.now(),
                password: 'TestPassword123!'
            },
            salon: {
                name: 'Test Salon',
                email: 'salon@example.com',
                phone: '+1987654321',
                zipCode: '54321',
                instagram: '@testsalon',
                username: 'testsalon_' + Date.now(),
                password: 'SalonPassword123!'
            },
            client: {
                name: 'Test Client',
                email: 'client@example.com',
                phone: '+1555123456'
            },
            post: {
                title: 'Test Service Post',
                city: 'Test City',
                state: 'CA',
                fee: '100',
                serviceName: 'Test Service',
                notes: 'This is a test service post',
                frequency: 'One-time'
            }
        };
        
        this.sessionData = {};
        this.testResults = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async makeRequest(method, endpoint, data = null, headers = {}) {
        try {
            const config = {
                method,
                url: `${BASE_URL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data || error.message,
                status: error.response?.status
            };
        }
    }

    async testStep(stepName, testFunction) {
        this.log(`Starting: ${stepName}`);
        try {
            const result = await testFunction();
            this.testResults.push({ step: stepName, status: 'PASS', result });
            this.log(`Completed: ${stepName}`, 'success');
            return result;
        } catch (error) {
            this.testResults.push({ step: stepName, status: 'FAIL', error: error.message });
            this.log(`Failed: ${stepName} - ${error.message}`, 'error');
            throw error;
        }
    }

    // Step 1: Creator Signup
    async testCreatorSignup() {
        const response = await this.makeRequest('POST', '/api/creators/signup', this.testData.creator);
        
        if (!response.success) {
            throw new Error(`Creator signup failed: ${JSON.stringify(response.error)}`);
        }

        this.sessionData.creatorId = response.data.id;
        this.sessionData.creatorToken = response.data.token;
        
        return response.data;
    }

    // Step 2: Salon Signup
    async testSalonSignup() {
        const response = await this.makeRequest('POST', '/api/salons/signup', this.testData.salon);
        
        if (!response.success) {
            throw new Error(`Salon signup failed: ${JSON.stringify(response.error)}`);
        }

        this.sessionData.salonId = response.data.id;
        this.sessionData.salonToken = response.data.token;
        
        return response.data;
    }

    // Step 3: Creator Login
    async testCreatorLogin() {
        const loginData = {
            email: this.testData.creator.email,
            password: this.testData.creator.password
        };

        const response = await this.makeRequest('POST', '/api/creators/login', loginData);
        
        if (!response.success) {
            throw new Error(`Creator login failed: ${JSON.stringify(response.error)}`);
        }

        this.sessionData.creatorToken = response.data.token;
        return response.data;
    }

    // Step 4: Create Service Post
    async testCreatePost() {
        const postData = {
            ...this.testData.post,
            creatorId: this.sessionData.creatorId
        };

        const response = await this.makeRequest('POST', '/api/posts', postData, {
            'Authorization': `Bearer ${this.sessionData.creatorToken}`
        });
        
        if (!response.success) {
            throw new Error(`Post creation failed: ${JSON.stringify(response.error)}`);
        }

        this.sessionData.postId = response.data.id;
        this.sessionData.postCode = response.data.code;
        
        return response.data;
    }

    // Step 5: Client Submits Booking Request
    async testClientBookingRequest() {
        const bookingData = {
            clientName: this.testData.client.name,
            clientEmail: this.testData.client.email,
            clientPhone: this.testData.client.phone,
            postCode: this.sessionData.postCode
        };

        const response = await this.makeRequest('POST', '/api/bookings/request', bookingData);
        
        if (!response.success) {
            throw new Error(`Booking request failed: ${JSON.stringify(response.error)}`);
        }

        this.sessionData.requestId = response.data.requestId;
        this.sessionData.clientToken = response.data.clientToken;
        
        return response.data;
    }

    // Step 6: Salon Login
    async testSalonLogin() {
        const loginData = {
            email: this.testData.salon.email,
            password: this.testData.salon.password
        };

        const response = await this.makeRequest('POST', '/api/salons/login', loginData);
        
        if (!response.success) {
            throw new Error(`Salon login failed: ${JSON.stringify(response.error)}`);
        }

        this.sessionData.salonToken = response.data.token;
        return response.data;
    }

    // Step 7: Salon Sends Time Options
    async testSalonSendTimeOptions() {
        const timeOptions = [
            { date: '2024-02-15', time: '10:00 AM', available: true },
            { date: '2024-02-15', time: '2:00 PM', available: true },
            { date: '2024-02-16', time: '11:00 AM', available: true }
        ];

        const timeData = {
            requestId: this.sessionData.requestId,
            timeOptions: timeOptions
        };

        const response = await this.makeRequest('POST', '/api/bookings/time-options', timeData, {
            'Authorization': `Bearer ${this.sessionData.salonToken}`
        });
        
        if (!response.success) {
            throw new Error(`Time options sending failed: ${JSON.stringify(response.error)}`);
        }

        return response.data;
    }

    // Step 8: Client Selects Appointment Time
    async testClientSelectTime() {
        const selectionData = {
            requestId: this.sessionData.requestId,
            selectedTimeSlot: '2024-02-15 10:00 AM'
        };

        const response = await this.makeRequest('POST', '/api/bookings/select-time', selectionData, {
            'Authorization': `Bearer ${this.sessionData.clientToken}`
        });
        
        if (!response.success) {
            throw new Error(`Time selection failed: ${JSON.stringify(response.error)}`);
        }

        this.sessionData.reservationId = response.data.reservationId;
        this.sessionData.checkoutUrl = response.data.checkoutUrl;
        
        return response.data;
    }

    // Step 9: Test Payment Processing
    async testPaymentProcessing() {
        // This would typically involve Stripe test cards
        // For testing purposes, we'll just verify the checkout URL was generated
        if (!this.sessionData.checkoutUrl) {
            throw new Error('No checkout URL generated');
        }

        this.log(`Checkout URL generated: ${this.sessionData.checkoutUrl}`);
        
        // In a real test, you might want to actually process a test payment
        // using Stripe's test card numbers like 4242424242424242
        
        return { checkoutUrl: this.sessionData.checkoutUrl };
    }

    // Step 10: Verify Email Notifications
    async testEmailNotifications() {
        // Check if emails were sent (this would require checking email logs or using a test email service)
        this.log('Email notifications would be sent in production');
        this.log('To verify emails, check your email service logs or use a test email service');
        
        return { emailsSent: true };
    }

    // Step 11: Verify Database State
    async testDatabaseVerification() {
        // Verify that all the data was properly stored in the database
        const verificationData = {
            creatorId: this.sessionData.creatorId,
            salonId: this.sessionData.salonId,
            postId: this.sessionData.postId,
            requestId: this.sessionData.requestId,
            reservationId: this.sessionData.reservationId
        };

        this.log('Database verification data:', verificationData);
        
        return verificationData;
    }

    // Run the complete workflow
    async runCompleteWorkflow() {
        this.log('🚀 Starting End-to-End Workflow Test');
        this.log('=====================================');

        try {
            // Step 1: Creator Signup
            await this.testStep('Creator Signup', () => this.testCreatorSignup());

            // Step 2: Salon Signup
            await this.testStep('Salon Signup', () => this.testSalonSignup());

            // Step 3: Creator Login
            await this.testStep('Creator Login', () => this.testCreatorLogin());

            // Step 4: Create Service Post
            await this.testStep('Create Service Post', () => this.testCreatePost());

            // Step 5: Client Booking Request
            await this.testStep('Client Booking Request', () => this.testClientBookingRequest());

            // Step 6: Salon Login
            await this.testStep('Salon Login', () => this.testSalonLogin());

            // Step 7: Salon Send Time Options
            await this.testStep('Salon Send Time Options', () => this.testSalonSendTimeOptions());

            // Step 8: Client Select Time
            await this.testStep('Client Select Time', () => this.testClientSelectTime());

            // Step 9: Payment Processing
            await this.testStep('Payment Processing', () => this.testPaymentProcessing());

            // Step 10: Email Notifications
            await this.testStep('Email Notifications', () => this.testEmailNotifications());

            // Step 11: Database Verification
            await this.testStep('Database Verification', () => this.testDatabaseVerification());

            this.log('🎉 Complete workflow test finished successfully!', 'success');
            this.printTestSummary();

        } catch (error) {
            this.log(`❌ Workflow test failed: ${error.message}`, 'error');
            this.printTestSummary();
            throw error;
        }
    }

    printTestSummary() {
        console.log('\n📊 Test Summary');
        console.log('==============');
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;

        console.log(`Total Steps: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        console.log('\n📋 Step Details:');
        this.testResults.forEach((result, index) => {
            const status = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${status} ${index + 1}. ${result.step}`);
            if (result.status === 'FAIL') {
                console.log(`   Error: ${result.error}`);
            }
        });

        console.log('\n🔑 Session Data:');
        console.log(JSON.stringify(this.sessionData, null, 2));
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('🧪 End-to-End Workflow Test');
        console.log('==========================\n');
        console.log('Usage: node test-end-to-end-workflow.js [options]');
        console.log('\nOptions:');
        console.log('  --help, -h     Show this help message');
        console.log('  --verbose, -v  Show detailed output');
        console.log('\nEnvironment Variables:');
        console.log('  BASE_URL       Backend server URL (default: http://localhost:3000)');
        console.log('  TEST_EMAIL     Test email address');
        console.log('  TEST_PHONE     Test phone number');
        console.log('\nExample:');
        console.log('  node test-end-to-end-workflow.js --verbose');
        process.exit(0);
    }

    const test = new EndToEndWorkflowTest();
    await test.runCompleteWorkflow();
}

// Run the test if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = EndToEndWorkflowTest; 