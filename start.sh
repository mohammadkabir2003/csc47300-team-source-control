#!/bin/bash

# CCNY Exchange - Start Both Frontend and Backend
# Run this from the root of the repo: ./start.sh

echo "🚀 Starting CCNY Exchange..."
echo ""

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3001 -ti:3000 -ti:5001 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2

# Start backend
echo "📦 Starting backend server (port 3001)..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend (port 3000)..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers starting..."
echo "📍 Backend:  http://localhost:3001/api"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
