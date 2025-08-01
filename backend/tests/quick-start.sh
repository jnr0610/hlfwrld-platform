#!/bin/bash

# 🚀 Quick Start Script for Booking System Testing
# This script sets up the test environment and runs a basic test

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "setup-test-environment.js" ]; then
    print_error "Please run this script from the backend/tests directory"
    exit 1
fi

print_status "🚀 Starting Quick Setup for Booking System Testing"
echo ""

# Step 1: Check Node.js
print_status "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js first."
    print_status "Visit: https://nodejs.org/"
    exit 1
fi

# Step 2: Check npm
print_status "Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
else
    print_error "npm not found. Please install npm first."
    exit 1
fi

# Step 3: Check if backend server is running
print_status "Checking if backend server is running..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    print_success "Backend server is running"
else
    print_warning "Backend server is not running"
    print_status "Starting backend server in background..."
    
    # Start backend server in background
    cd ..
    nohup node index.js > server.log 2>&1 &
    SERVER_PID=$!
    cd tests
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if server started successfully
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Backend server started successfully (PID: $SERVER_PID)"
        echo $SERVER_PID > .server_pid
    else
        print_error "Failed to start backend server"
        print_status "Please start it manually: cd ../ && node index.js"
        exit 1
    fi
fi

# Step 4: Run setup script
print_status "Running test environment setup..."
if node setup-test-environment.js; then
    print_success "Test environment setup completed"
else
    print_warning "Setup completed with warnings - some tests may fail"
fi

# Step 5: Run a quick test
print_status "Running quick connectivity test..."
if node test-stripe.js; then
    print_success "Basic connectivity test passed"
else
    print_warning "Basic connectivity test failed - check your configuration"
fi

# Step 6: Show next steps
echo ""
print_success "🎉 Quick setup completed!"
echo ""
print_status "Next steps:"
echo "  1. Configure your API keys in the .env file"
echo "  2. Run the complete workflow test:"
echo "     node run-all-tests.js e2e"
echo ""
print_status "Available test commands:"
echo "  node run-all-tests.js          # Run all tests"
echo "  node run-all-tests.js e2e      # End-to-end workflow test"
echo "  node run-all-tests.js payment  # Payment workflow test"
echo "  node run-all-tests.js resend   # Email service test"
echo "  node run-all-tests.js stripe   # Basic Stripe test"
echo ""
print_status "For detailed help:"
echo "  node run-all-tests.js --help"
echo "  node setup-test-environment.js --help"
echo ""

# Cleanup function
cleanup() {
    if [ -f .server_pid ]; then
        SERVER_PID=$(cat .server_pid)
        if kill -0 $SERVER_PID 2>/dev/null; then
            print_status "Stopping backend server (PID: $SERVER_PID)..."
            kill $SERVER_PID
            rm .server_pid
        fi
    fi
}

# Set up cleanup on script exit
trap cleanup EXIT

print_status "Setup complete! You can now run your tests."
print_status "Press Ctrl+C to stop the backend server when done." 