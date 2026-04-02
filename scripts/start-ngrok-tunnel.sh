#!/bin/bash

echo "🌐 Starting ngrok tunnel..."
echo "Your dev server (port 8080) will be exposed to the internet"
echo ""

# Start ngrok
ngrok http 8080
