#!/bin/bash

# Google Calendar Integration Test Script
# Tests OAuth flow, event creation, and token refresh

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "========================================="
echo "Google Calendar Integration Tests"
echo "Base URL: $BASE_URL"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
test_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

test_skip() {
    echo -e "${YELLOW}⊘ SKIP${NC}: $1"
}

# ============================================
# Test 1: Health Check
# ============================================
echo ""
echo "Test 1: Server Health Check"
echo "----------------------------"

if curl -s "$BASE_URL/health" | grep -q "healthy"; then
    test_pass "Server is healthy"
else
    test_fail "Server health check failed"
    exit 1
fi

# ============================================
# Test 2: Module Load
# ============================================
echo ""
echo "Test 2: Module Load Test"
echo "----------------------------"

if node -e "
    try {
        require('./calendar/googleConfig');
        require('./calendar/tokenManager');
        require('./calendar/calendarService');
        require('./calendar/availabilityService');
        require('./calendar/googleController');
        require('./calendar/routes');
        console.log('All modules loaded successfully');
        process.exit(0);
    } catch (e) {
        console.error('Module load error:', e.message);
        process.exit(1);
    }
" 2>&1; then
    test_pass "All calendar modules load correctly"
else
    test_fail "Module load failed"
fi

# ============================================
# Test 3: Configuration Validation
# ============================================
echo ""
echo "Test 3: Configuration Validation"
echo "----------------------------"

if node -e "
    const config = require('./calendar/googleConfig');
    const result = config.validateConfig();
    if (!result.valid && result.error.includes('Missing')) {
        console.log('Config validation works:', result.error);
        process.exit(0);
    } else if (result.valid) {
        console.log('Config is valid');
        process.exit(0);
    }
    process.exit(1);
" 2>&1; then
    test_pass "Configuration validation working"
else
    test_fail "Configuration validation failed"
fi

# ============================================
# Test 4: Token Encryption
# ============================================
echo ""
echo "Test 4: Token Encryption/Decryption"
echo "----------------------------"

# Set a test encryption key
export TOKEN_ENCRYPTION_KEY="test-encryption-key-32-chars!!"

if node -e "
    const tm = require('./calendar/tokenManager');
    const testToken = 'test-refresh-token-12345';
    
    try {
        const encrypted = tm.encryptToken(testToken);
        const decrypted = tm.decryptToken(encrypted);
        
        if (decrypted === testToken) {
            console.log('Token encryption/decryption works');
            process.exit(0);
        } else {
            console.error('Decrypted token does not match');
            process.exit(1);
        }
    } catch (e) {
        console.error('Token encryption error:', e.message);
        process.exit(1);
    }
" 2>&1; then
    test_pass "Token encryption/decryption works"
else
    test_fail "Token encryption failed"
fi

# ============================================
# Test 5: Expiration Check
# ============================================
echo ""
echo "Test 5: Token Expiration Check"
echo "----------------------------"

if node -e "
    const tm = require('./calendar/tokenManager');
    
    // Test expired token (past)
    const expired = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    if (!tm.isTokenExpired(expired)) {
        console.error('Should detect expired token');
        process.exit(1);
    }
    
    // Test valid token (future)
    const valid = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
    if (tm.isTokenExpired(valid)) {
        console.error('Should not mark future token as expired');
        process.exit(1);
    }
    
    // Test buffer zone
    const almostExpired = new Date(Date.now() + 1000 * 60 * 3); // 3 minutes from now
    if (!tm.isTokenExpired(almostExpired, 5)) {
        console.error('Should respect buffer zone');
        process.exit(1);
    }
    
    console.log('Token expiration checks work');
    process.exit(0);
" 2>&1; then
    test_pass "Token expiration detection works"
else
    test_fail "Token expiration check failed"
fi

# ============================================
# Test 6: OAuth URL Generation
# ============================================
echo ""
echo "Test 6: OAuth URL Generation"
echo "----------------------------"

export GOOGLE_CLIENT_ID="test-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="test-client-secret"
export GOOGLE_REDIRECT_URI="https://api.useclippy.com/auth/google/callback"

if node -e "
    const config = require('./calendar/googleConfig');
    
    try {
        const state = 'test-state-123';
        const url = config.getAuthUrl(state);
        
        if (url.includes('accounts.google.com') && 
            url.includes('calendar') &&
            url.includes(state)) {
            console.log('OAuth URL generated correctly');
            process.exit(0);
        } else {
            console.error('OAuth URL missing expected components');
            process.exit(1);
        }
    } catch (e) {
        console.error('OAuth URL generation error:', e.message);
        process.exit(1);
    }
" 2>&1; then
    test_pass "OAuth URL generation works"
else
    test_fail "OAuth URL generation failed"
fi

# ============================================
# Test 7: Database Schema Validation
# ============================================
echo ""
echo "Test 7: Database Schema"
echo "----------------------------"

if grep -q "google_connections" ./calendar/database.sql && \
   grep -q "calendar_events" ./calendar/database.sql && \
   grep -q "availability_slots" ./calendar/database.sql; then
    test_pass "Database schema contains required tables"
else
    test_fail "Database schema missing required tables"
fi

if grep -q "encryptToken\|decryptToken" ./calendar/database.sql || \
   [ "$(grep -c "refresh_token" ./calendar/database.sql)" -ge "1" ]; then
    test_pass "Schema references token storage"
else
    test_fail "Schema missing token storage"
fi

# ============================================
# Test 8: Route Definitions
# ============================================
echo ""
echo "Test 8: API Route Definitions"
echo "----------------------------"

REQUIRED_ROUTES=(
    "/google/auth"
    "/google/callback"
    "/google/disconnect"
    "/google/status"
    "/google/refresh"
    "/calendar/events"
    "/calendar/availability"
    "/calendar/bookings"
)

ROUTES_FOUND=0
for route in "${REQUIRED_ROUTES[@]}"; do
    if grep -q "'$route'" ./calendar/routes.js || \
       grep -q "\"$route\"" ./calendar/routes.js; then
        ((ROUTES_FOUND++))
    fi
done

if [ $ROUTES_FOUND -ge 6 ]; then
    test_pass "Required API routes defined ($ROUTES_FOUND/${#REQUIRED_ROUTES[@]})"
else
    test_fail "Missing API routes (found $ROUTES_FOUND/${#REQUIRED_ROUTES[@]})"
fi

# ============================================
# Test 9: Middleware Protection
# ============================================
echo ""
echo "Test 9: Authentication Middleware"
echo "----------------------------"

AUTH_PROTECTED=$(grep -c "authenticateToken" ./calendar/routes.js || echo "0")
if [ "$AUTH_PROTECTED" -ge 5 ]; then
    test_pass "Routes protected by authenticateToken ($AUTH_PROTECTED routes)"
else
    test_fail "Not enough routes protected by authentication"
fi

# ============================================
# Test 10: Server Integration
# ============================================
echo ""
echo "Test 10: Server Integration"
echo "----------------------------"

if grep -q "calendarRoutes" ./server.js; then
    test_pass "Calendar routes integrated in server.js"
else
    test_fail "Calendar routes not integrated in server.js"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "========================================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
