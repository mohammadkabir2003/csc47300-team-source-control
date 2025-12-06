#!/bin/bash

# CCNY Exchange - Start Script
# This script installs dependencies and starts both frontend and backend servers

echo "=========================================="
echo "  CCNY Exchange - Starting Application"
echo "=========================================="
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if ports 3000 and 3001 are in use and kill them
echo "🔄 Checking ports 3000 and 3001..."

PORT_3000_PID=$(lsof -ti:3000 2>/dev/null)
PORT_3001_PID=$(lsof -ti:3001 2>/dev/null)

if [ -n "$PORT_3000_PID" ]; then
    echo "⚠️  Port 3000 is in use. Terminating process..."
    kill -9 $PORT_3000_PID 2>/dev/null
    sleep 1
fi

if [ -n "$PORT_3001_PID" ]; then
    echo "⚠️  Port 3001 is in use. Terminating process..."
    kill -9 $PORT_3001_PID 2>/dev/null
    sleep 1
fi

echo "✅ Ports 3000 and 3001 are clear"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install --silent

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install --silent

# Start backend server (port 3001)
echo ""
echo "🚀 Starting backend server on port 3001..."
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server (port 3000)
echo "🚀 Starting frontend server on port 3000..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --port 3000 &
FRONTEND_PID=$!

# Wait for servers to fully start
sleep 3

echo ""
echo "=========================================="
echo "  ✅ Application Started Successfully!"
echo "=========================================="
echo ""
echo "  🖥️  Frontend: http://localhost:3000"
echo "  🔧 Backend:  http://localhost:3001"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "=========================================="

# Wait for both processes
wait
