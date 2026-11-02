#!/bin/bash
set -u
echo "Starting GASTECT in Vercel Hybrid Tunnel Mode..."

BRIDGE_PID=""
NGROK_PID=""

# Clean up background processes on exit. Registered early so it is in place
# before the foreground Next.js server blocks (NGROK_PID is empty when ngrok
# is not installed, so each kill is guarded).
cleanup() {
    if [ -n "$BRIDGE_PID" ]; then kill "$BRIDGE_PID" 2>/dev/null; fi
    if [ -n "$NGROK_PID" ]; then kill "$NGROK_PID" 2>/dev/null; fi
}
trap cleanup EXIT INT TERM

# 1. Start Python bridge in background
python bridge/bridge.py &
BRIDGE_PID=$!

# 2. Start ngrok tunnel on port 8765
if command -v ngrok &> /dev/null; then
    echo "Starting ngrok tunnel for WebSocket..."
    ngrok http 8765 &
    NGROK_PID=$!
else
    echo "ngrok not found. Please install ngrok or configure Cloudflare tunnel for remote Vercel access."
fi

# 3. Start Next.js development server
cd website
npm run dev
