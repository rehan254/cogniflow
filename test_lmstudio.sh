#!/bin/bash

echo "🔄 Testing LM Studio API connection..."

# Test if server is responding
if curl -s -f http://localhost:1234/v1/models > /dev/null 2>&1; then
    echo "✅ LM Studio API server is running!"
    echo "📋 Available models:"
    curl -s http://localhost:1234/v1/models | python3 -m json.tool 2>/dev/null || curl -s http://localhost:1234/v1/models
    echo ""
    echo "🎉 CogniFlow is ready to use your local DeepSeek model!"
    echo "🌐 Go to http://localhost:8000 and try the AI features"
else
    echo "❌ LM Studio API server is not responding"
    echo ""
    echo "📝 Please ensure in LM Studio:"
    echo "   1. Go to 'Local Server' tab"
    echo "   2. Select your DeepSeek model"
    echo "   3. Click 'Start Server'"
    echo "   4. Wait for 'Server is running' message"
    echo ""
    echo "🔄 Run this script again once the server is started"
fi 