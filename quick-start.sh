#!/bin/bash

# Quick Start Script for Local Development
# Run with: ./quick-start.sh

echo "=================================="
echo "🚀 Expense Tracker - Local Setup"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "📥 Download from: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Install dependencies if needed
if [ ! -d "local-server/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd local-server
    npm install
    cd ..
    echo "✓ Dependencies installed"
    echo ""
else
    echo "✓ Dependencies already installed"
    echo ""
fi

# Start the server
echo "🚀 Starting local server..."
echo ""
echo "Server will be available at:"
echo "  📍 Admin:  http://localhost:3000/admin.html"
echo "  📍 User:   http://localhost:3000/user.html"
echo "  📍 Tests:  http://localhost:3000/tests/frontend.test.html"
echo "  📍 Debug:  http://localhost:3000/debug"
echo ""
echo "🔑 Access Keys:"
echo "  Admin: admin123"
echo "  User:  user123"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="
echo ""

cd local-server
npm start
