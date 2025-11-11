#!/bin/bash

# Simple script to get user ID from chat
# This assumes you know which chat has the P&L data

echo "🔍 Getting user ID from chat a9e8ab45-4281-473d-b65f-5cd9346acb00..."
echo ""
echo "Option 1: Check the chat in your browser"
echo "  1. Open http://localhost:3000/chat/a9e8ab45-4281-473d-b65f-5cd9346acb00"
echo "  2. Open browser DevTools (F12)"
echo "  3. Run: localStorage.getItem('clerk-db-jwt')"
echo "  4. Decode the JWT at jwt.io to get your user ID"
echo ""
echo "Option 2: Use your Clerk Dashboard"
echo "  1. Go to https://dashboard.clerk.com/"
echo "  2. Find your application"
echo "  3. Go to Users section"
echo "  4. Copy your user ID from there"
echo ""
echo "Option 3: I can help you query the database directly"
echo "  Run: pnpm dev"
echo "  Then navigate to your app and I'll help you find your user ID"
echo ""
echo "Once you have your user ID, run:"
echo "  export TEST_USER_ID=\"your-user-id-here\""
echo "  pnpm exec tsx scripts/test-xero-pl.ts"
