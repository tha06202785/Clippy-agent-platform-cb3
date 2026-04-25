#!/bin/bash

# Clippy Authentication API Test Script
# Usage: chmod +x test-auth.sh && ./test-auth.sh

BASE_URL="http://localhost:3001"
TEST_EMAIL="test$(date +%s)@example.com"
TEST_PASSWORD="Test1234!@#$"

echo "=========================================="
echo "Clippy Auth API Tests"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
    fi
}

# 1. Health Check
echo "1. Testing Health Endpoint..."
HEALTH=$(curl -s -w "%{http_code}" -o /tmp/health.json "$BASE_URL/health")
if [ "$HEALTH" = "200" ]; then
    print_result 0 "Health check endpoint"
else
    print_result 1 "Health check endpoint (HTTP $HEALTH)"
fi
echo ""

# 2. Register
echo "2. Testing User Registration..."
REGISTER=$(curl -s -w "%{http_code}" -o /tmp/register.json \
    -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
if [ "$REGISTER" = "201" ]; then
    print_result 0 "User registration (email: $TEST_EMAIL)"
    USER_ID=$(cat /tmp/register.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
else
    print_result 1 "User registration (HTTP $REGISTER)"
    cat /tmp/register.json
fi
echo ""

# 3. Register with weak password (should fail)
echo "3. Testing Password Strength Validation..."
WEAK=$(curl -s -w "%{http_code}" -o /tmp/weak.json \
    -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"weak@test.com\",\"password\":\"123\"}")
if [ "$WEAK" = "400" ]; then
    print_result 0 "Password strength validation rejects weak password"
else
    print_result 1 "Password strength validation (expected 400, got $WEAK)"
fi
echo ""

# 4. Register duplicate email (should fail)
echo "4. Testing Duplicate Email Rejection..."
DUPLICATE=$(curl -s -w "%{http_code}" -o /tmp/duplicate.json \
    -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
if [ "$DUPLICATE" = "409" ]; then
    print_result 0 "Duplicate email rejection"
else
    print_result 1 "Duplicate email rejection (expected 409, got $DUPLICATE)"
fi
echo ""

# 5. Login
echo "5. Testing User Login..."
# Store cookies
LOGIN=$(curl -s -w "%{http_code}" -o /tmp/login.json \
    -c /tmp/cookies.txt \
    -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
if [ "$LOGIN" = "200" ]; then
    print_result 0 "User login"
else
    print_result 1 "User login (HTTP $LOGIN)"
    cat /tmp/login.json
fi
echo ""

# 6. Login with wrong password
echo "6. Testing Invalid Login Credentials..."
INVALID_LOGIN=$(curl -s -w "%{http_code}" -o /tmp/invalid.json \
    -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}")
if [ "$INVALID_LOGIN" = "401" ]; then
    print_result 0 "Invalid credentials rejection"
else
    print_result 1 "Invalid credentials (expected 401, got $INVALID_LOGIN)"
fi
echo ""

# 7. Get current user (protected route)
echo "7. Testing Protected Route (/api/auth/me)..."
ME=$(curl -s -w "%{http_code}" -o /tmp/me.json \
    -b /tmp/cookies.txt \
    "$BASE_URL/api/auth/me")
if [ "$ME" = "200" ]; then
    print_result 0 "Protected route with valid token"
else
    print_result 1 "Protected route (HTTP $ME)"
fi
echo ""

# 8. Protected route without token
echo "8. Testing Protected Route Without Authentication..."
NO_AUTH=$(curl -s -w "%{http_code}" -o /tmp/noauth.json \
    "$BASE_URL/api/auth/me")
if [ "$NO_AUTH" = "401" ]; then
    print_result 0 "Protected route rejects unauthenticated request"
else
    print_result 1 "Protected route without auth (expected 401, got $NO_AUTH)"
fi
echo ""

# 9. Forgot password
echo "9. Testing Forgot Password..."
FORGOT=$(curl -s -w "%{http_code}" -o /tmp/forgot.json \
    -X POST "$BASE_URL/api/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\"}")
if [ "$FORGOT" = "200" ]; then
    print_result 0 "Forgot password request"
else
    print_result 1 "Forgot password (HTTP $FORGOT)"
fi
echo ""

# 10. Refresh token
echo "10. Testing Token Refresh..."
REFRESH=$(curl -s -w "%{http_code}" -o /tmp/refresh.json \
    -b /tmp/cookies.txt \
    -X POST "$BASE_URL/api/auth/refresh-token")
if [ "$REFRESH" = "200" ]; then
    print_result 0 "Token refresh endpoint"
else
    print_result 1 "Token refresh (HTTP $REFRESH)"
fi
echo ""

# 11. Logout
echo "11. Testing Logout..."
LOGOUT=$(curl -s -w "%{http_code}" -o /tmp/logout.json \
    -b /tmp/cookies.txt \
    -X POST "$BASE_URL/api/auth/logout")
if [ "$LOGOUT" = "200" ]; then
    print_result 0 "Logout endpoint"
else
    print_result 1 "Logout (HTTP $LOGOUT)"
fi
echo ""

# 12. Try accessing protected route after logout
echo "12. Testing Token Invalidation After Logout..."
AFTER_LOGOUT=$(curl -s -w "%{http_code}" -o /tmp/afterlogout.json \
    -b /tmp/cookies.txt \
    "$BASE_URL/api/auth/me")
if [ "$AFTER_LOGOUT" = "401" ]; then
    print_result 0 "Token invalidated after logout"
else
    print_result 1 "Token after logout (expected 401, got $AFTER_LOGOUT)"
fi
echo ""

echo "=========================================="
echo "Test Summary for email: $TEST_EMAIL"
echo "=========================================="
echo "To test manually with curl:"
echo ""
echo "# Register:"
echo "curl -X POST $BASE_URL/api/auth/register \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}'"
echo ""
echo "# Login (stores cookies):"
echo "curl -X POST $BASE_URL/api/auth/login \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -c cookies.txt \\"
echo "  -d '{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}'"
echo ""
echo "# Get current user:"
echo "curl $BASE_URL/api/auth/me -b cookies.txt"
echo ""
