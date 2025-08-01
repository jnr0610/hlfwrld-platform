require('dotenv').config();
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

class PaymentWorkflowTest {
    constructor() {
        this.testCards = {
            success: {
                number: '4242424242424242',
                exp_month: 12,
                exp_year: 2025,
                cvc: '123'
            },
            declined: {
                number: '4000000000000002',
                exp_month: 12,
                exp_year: 2025,
                cvc: '123'
            },
            insufficient_funds: {
                number: '4000000000009995',
                exp_month: 12,
                exp_year: 2025,
                cvc: '123'
            },
            expired: {
                number: '4000000000000069',
                exp_month: 12,
                exp_year: 2020,
                cvc: '123'
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

    // Test Stripe Connection
    async testStripeConnection() {
        try {
            const account = await stripe.accounts.retrieve();
            this.log(`Stripe account connected: ${account.id}`);
            return { accountId: account.id, email: account.email };
        } catch (error) {
            throw new Error(`Stripe connection failed: ${error.message}`);
        }
    }

    // Create a test payment intent
    async testPaymentIntentCreation() {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 10000, // $100.00
                currency: 'usd',
                description: 'Test payment for booking system',
                metadata: {
                    test: 'true',
                    workflow: 'payment-test'
                }
            });

            this.sessionData.paymentIntentId = paymentIntent.id;
            this.log(`Payment intent created: ${paymentIntent.id}`);
            
            return {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status
            };
        } catch (error) {
            throw new Error(`Payment intent creation failed: ${error.message}`);
        }
    }

    // Test successful payment
    async testSuccessfulPayment() {
        try {
            const paymentMethod = await stripe.paymentMethods.create({
                type: 'card',
                card: this.testCards.success
            });

            const paymentIntent = await stripe.paymentIntents.confirm(
                this.sessionData.paymentIntentId,
                {
                    payment_method: paymentMethod.id
                }
            );

            if (paymentIntent.status === 'succeeded') {
                this.log(`Payment succeeded: ${paymentIntent.id}`);
                return {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    amount: paymentIntent.amount
                };
            } else {
                throw new Error(`Payment failed with status: ${paymentIntent.status}`);
            }
        } catch (error) {
            throw new Error(`Successful payment test failed: ${error.message}`);
        }
    }

    // Test declined payment
    async testDeclinedPayment() {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 10000,
                currency: 'usd',
                description: 'Test declined payment'
            });

            const paymentMethod = await stripe.paymentMethods.create({
                type: 'card',
                card: this.testCards.declined
            });

            const confirmedIntent = await stripe.paymentIntents.confirm(
                paymentIntent.id,
                {
                    payment_method: paymentMethod.id
                }
            );

            // This should fail, which is expected
            if (confirmedIntent.status === 'requires_payment_method') {
                this.log(`Payment correctly declined: ${confirmedIntent.id}`);
                return {
                    id: confirmedIntent.id,
                    status: confirmedIntent.status,
                    expected: 'declined'
                };
            } else {
                throw new Error('Payment should have been declined but was not');
            }
        } catch (error) {
            // If the error is about the card being declined, that's expected
            if (error.message.includes('card was declined')) {
                this.log('Payment correctly declined as expected');
                return { expected: 'declined', error: error.message };
            }
            throw new Error(`Declined payment test failed: ${error.message}`);
        }
    }

    // Test insufficient funds
    async testInsufficientFunds() {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 10000,
                currency: 'usd',
                description: 'Test insufficient funds'
            });

            const paymentMethod = await stripe.paymentMethods.create({
                type: 'card',
                card: this.testCards.insufficient_funds
            });

            const confirmedIntent = await stripe.paymentIntents.confirm(
                paymentIntent.id,
                {
                    payment_method: paymentMethod.id
                }
            );

            if (confirmedIntent.status === 'requires_payment_method') {
                this.log(`Insufficient funds correctly detected: ${confirmedIntent.id}`);
                return {
                    id: confirmedIntent.id,
                    status: confirmedIntent.status,
                    expected: 'insufficient_funds'
                };
            } else {
                throw new Error('Insufficient funds should have been detected but was not');
            }
        } catch (error) {
            if (error.message.includes('insufficient funds')) {
                this.log('Insufficient funds correctly detected as expected');
                return { expected: 'insufficient_funds', error: error.message };
            }
            throw new Error(`Insufficient funds test failed: ${error.message}`);
        }
    }

    // Test expired card
    async testExpiredCard() {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 10000,
                currency: 'usd',
                description: 'Test expired card'
            });

            const paymentMethod = await stripe.paymentMethods.create({
                type: 'card',
                card: this.testCards.expired
            });

            const confirmedIntent = await stripe.paymentIntents.confirm(
                paymentIntent.id,
                {
                    payment_method: paymentMethod.id
                }
            );

            if (confirmedIntent.status === 'requires_payment_method') {
                this.log(`Expired card correctly detected: ${confirmedIntent.id}`);
                return {
                    id: confirmedIntent.id,
                    status: confirmedIntent.status,
                    expected: 'expired_card'
                };
            } else {
                throw new Error('Expired card should have been detected but was not');
            }
        } catch (error) {
            if (error.message.includes('expired')) {
                this.log('Expired card correctly detected as expected');
                return { expected: 'expired_card', error: error.message };
            }
            throw new Error(`Expired card test failed: ${error.message}`);
        }
    }

    // Test refund
    async testRefund() {
        try {
            // First create a successful payment
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 10000,
                currency: 'usd',
                description: 'Test payment for refund'
            });

            const paymentMethod = await stripe.paymentMethods.create({
                type: 'card',
                card: this.testCards.success
            });

            const confirmedIntent = await stripe.paymentIntents.confirm(
                paymentIntent.id,
                {
                    payment_method: paymentMethod.id
                }
            );

            if (confirmedIntent.status === 'succeeded') {
                // Now create a refund
                const refund = await stripe.refunds.create({
                    payment_intent: confirmedIntent.id,
                    reason: 'requested_by_customer'
                });

                this.log(`Refund created: ${refund.id}`);
                return {
                    paymentIntentId: confirmedIntent.id,
                    refundId: refund.id,
                    amount: refund.amount,
                    status: refund.status
                };
            } else {
                throw new Error('Payment must succeed before refund can be tested');
            }
        } catch (error) {
            throw new Error(`Refund test failed: ${error.message}`);
        }
    }

    // Test webhook handling (simulated)
    async testWebhookHandling() {
        try {
            // Simulate webhook payload
            const webhookPayload = {
                id: 'evt_test_webhook',
                object: 'event',
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: this.sessionData.paymentIntentId,
                        amount: 10000,
                        currency: 'usd',
                        status: 'succeeded'
                    }
                }
            };

            this.log('Webhook payload simulated successfully');
            return {
                webhookId: webhookPayload.id,
                eventType: webhookPayload.type,
                paymentIntentId: webhookPayload.data.object.id
            };
        } catch (error) {
            throw new Error(`Webhook test failed: ${error.message}`);
        }
    }

    // Test checkout session creation
    async testCheckoutSessionCreation() {
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Test Service',
                                description: 'Test service for booking system'
                            },
                            unit_amount: 10000, // $100.00
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${BASE_URL}/payment/cancel`,
                metadata: {
                    test: 'true',
                    workflow: 'checkout-test'
                }
            });

            this.sessionData.checkoutSessionId = session.id;
            this.log(`Checkout session created: ${session.id}`);
            
            return {
                id: session.id,
                url: session.url,
                status: session.status
            };
        } catch (error) {
            throw new Error(`Checkout session creation failed: ${error.message}`);
        }
    }

    // Run all payment tests
    async runPaymentTests() {
        this.log('💳 Starting Payment Workflow Tests');
        this.log('==================================');

        try {
            // Test 1: Stripe Connection
            await this.testStep('Stripe Connection', () => this.testStripeConnection());

            // Test 2: Payment Intent Creation
            await this.testStep('Payment Intent Creation', () => this.testPaymentIntentCreation());

            // Test 3: Successful Payment
            await this.testStep('Successful Payment', () => this.testSuccessfulPayment());

            // Test 4: Declined Payment
            await this.testStep('Declined Payment', () => this.testDeclinedPayment());

            // Test 5: Insufficient Funds
            await this.testStep('Insufficient Funds', () => this.testInsufficientFunds());

            // Test 6: Expired Card
            await this.testStep('Expired Card', () => this.testExpiredCard());

            // Test 7: Refund Processing
            await this.testStep('Refund Processing', () => this.testRefund());

            // Test 8: Checkout Session Creation
            await this.testStep('Checkout Session Creation', () => this.testCheckoutSessionCreation());

            // Test 9: Webhook Handling
            await this.testStep('Webhook Handling', () => this.testWebhookHandling());

            this.log('🎉 Payment workflow tests completed successfully!', 'success');
            this.printTestSummary();

        } catch (error) {
            this.log(`❌ Payment workflow tests failed: ${error.message}`, 'error');
            this.printTestSummary();
            throw error;
        }
    }

    printTestSummary() {
        console.log('\n📊 Payment Test Summary');
        console.log('======================');
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;

        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        console.log('\n📋 Test Details:');
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
        console.log('💳 Payment Workflow Test');
        console.log('=======================\n');
        console.log('Usage: node test-payment-workflow.js [options]');
        console.log('\nOptions:');
        console.log('  --help, -h     Show this help message');
        console.log('  --verbose, -v  Show detailed output');
        console.log('\nEnvironment Variables:');
        console.log('  STRIPE_SECRET_KEY  Your Stripe secret key');
        console.log('  BASE_URL           Backend server URL');
        console.log('\nTest Cards Used:');
        console.log('  Success: 4242424242424242');
        console.log('  Declined: 4000000000000002');
        console.log('  Insufficient Funds: 4000000000009995');
        console.log('  Expired: 4000000000000069');
        console.log('\nExample:');
        console.log('  node test-payment-workflow.js --verbose');
        process.exit(0);
    }

    const test = new PaymentWorkflowTest();
    await test.runPaymentTests();
}

// Run the test if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Payment test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = PaymentWorkflowTest; 