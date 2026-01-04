#!/bin/bash
# Start both frontend and backend servers for testing

# Start backend server in background
cd server && npm run dev &
BACKEND_PID=$!

# Start frontend server in background  
cd .. && npm run dev &
FRONTEND_PID=$!

# Wait for both servers to be ready
echo "Waiting for servers to start..."
sleep 5

# Check if servers are running
for i in {1..30}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1 && curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "Both servers are ready!"
    exit 0
  fi
  sleep 1
done

echo "Servers failed to start"
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
exit 1

