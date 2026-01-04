#!/bin/bash
# Check if backend server is running

BACKEND_URL="http://localhost:3001/health"

if curl -s "$BACKEND_URL" > /dev/null 2>&1; then
  echo "✅ Backend server is running on port 3001"
  exit 0
else
  echo "❌ Backend server is NOT running on port 3001"
  echo ""
  echo "Please start the backend server:"
  echo "  cd server"
  echo "  npm run dev"
  echo ""
  exit 1
fi

