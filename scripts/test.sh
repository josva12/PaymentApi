#!/bin/bash

# Test Runner Script for Kenyan Payment API
# Usage: ./scripts/test.sh [option]

set -e

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

# Function to check if PostgreSQL is running
check_postgres() {
    print_status "Checking PostgreSQL connection..."
    if pg_isready -q; then
        print_success "PostgreSQL is running"
    else
        print_error "PostgreSQL is not running. Please start PostgreSQL first."
        exit 1
    fi
}

# Function to setup test database
setup_test_db() {
    print_status "Setting up test database..."
    
    # Create test database if it doesn't exist
    createdb payment_test 2>/dev/null || print_warning "Database 'payment_test' already exists or creation failed"
    
    # Run database migrations
    print_status "Running database migrations..."
    npm run db:push
}

# Function to run tests
run_tests() {
    local test_type=$1
    
    case $test_type in
        "unit")
            print_status "Running unit tests..."
            npm run test:run -- tests/*.test.ts
            ;;
        "integration")
            print_status "Running integration tests..."
            npm run test:run -- tests/integration.test.ts
            ;;
        "auth")
            print_status "Running authentication tests..."
            npm run test:run -- tests/auth.test.ts
            ;;
        "payments")
            print_status "Running payment tests..."
            npm run test:run -- tests/payments.test.ts
            ;;
        "security")
            print_status "Running security tests..."
            npm run test:run -- tests/security.test.ts
            ;;
        "coverage")
            print_status "Running tests with coverage..."
            npm run test:coverage
            ;;
        "watch")
            print_status "Running tests in watch mode..."
            npm run test:watch
            ;;
        "all"|"")
            print_status "Running all tests..."
            npm run test:run
            ;;
        *)
            print_error "Unknown test type: $test_type"
            echo "Available options: unit, integration, auth, payments, security, coverage, watch, all"
            exit 1
            ;;
    esac
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up test environment..."
    # Add any cleanup logic here
}

# Main execution
main() {
    local test_type=${1:-"all"}
    
    print_status "Starting test runner for Kenyan Payment API..."
    
    # Check dependencies
    check_postgres
    
    # Setup test environment
    setup_test_db
    
    # Run tests
    run_tests "$test_type"
    
    # Cleanup
    cleanup
    
    print_success "Test run completed!"
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Test Runner for Kenyan Payment API"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  unit        Run unit tests only"
        echo "  integration Run integration tests only"
        echo "  auth        Run authentication tests only"
        echo "  payments    Run payment tests only"
        echo "  security    Run security tests only"
        echo "  coverage    Run tests with coverage report"
        echo "  watch       Run tests in watch mode"
        echo "  all         Run all tests (default)"
        echo "  help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Run all tests"
        echo "  $0 auth              # Run authentication tests only"
        echo "  $0 coverage          # Run tests with coverage"
        echo "  $0 watch             # Run tests in watch mode"
        ;;
    *)
        main "$@"
        ;;
esac 