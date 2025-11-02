#!/bin/bash
# Simple script to test the regulatory scraper end-to-end
# Triggers the actual cron job endpoint

set -e

echo "======================================"
echo "Testing Regulatory Scraper End-to-End"
echo "======================================"
echo ""

# Check environment
if [ -z "$FIRECRAWL_API_KEY" ]; then
    echo "❌ FIRECRAWL_API_KEY not set"
    exit 1
fi

if [ -z "$POSTGRES_URL" ]; then
    echo "❌ POSTGRES_URL not set"
    exit 1
fi

if [ -z "$CRON_SECRET" ]; then
    echo "❌ CRON_SECRET not set"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Test 1: Test the actual cron endpoint (simulates production)
echo "======================================"
echo "TEST: Calling cron job endpoint"
echo "======================================"
echo "URL: http://localhost:3000/api/cron/regulatory-sync"
echo ""

RESPONSE=$(curl -s -X GET "http://localhost:3000/api/cron/regulatory-sync" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status Code: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Test PASSED: Cron job executed successfully"
    echo ""
    echo "Response:"
    echo "$BODY" | python3 -m json.tool
else
    echo "❌ Test FAILED: HTTP $HTTP_CODE"
    echo ""
    echo "Response:"
    echo "$BODY"
    exit 1
fi

echo ""
echo "======================================"
echo "🎉 ALL TESTS PASSED"
echo "======================================"
