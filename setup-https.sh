#!/bin/bash
# Setup HTTPS for EmComm Chat
# This generates a self-signed certificate for local network use

echo "🔒 Setting up HTTPS for EmComm Chat..."
echo ""
echo "Note: This creates a self-signed certificate. Browsers will show a warning."
echo "Users must accept the warning to proceed (safe for local networks)."
echo ""

# Get the server's IP address
IP=$(hostname -I | awk '{print $1}')
echo "Detected IP address: $IP"
echo ""

# Create ssl directory
mkdir -p ssl

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 \
  -subj "/CN=$IP" \
  -addext "subjectAltName=IP:$IP,IP:127.0.0.1,DNS:localhost"

echo ""
echo "✅ Certificate generated!"
echo ""
echo "⚠️  IMPORTANT: Users must accept the security warning in their browser"
echo ""
echo "To use HTTPS:"
echo "1. Set ENABLE_HTTPS=true in config.js"
echo "2. Restart the server: npm start"
echo "3. Access via: https://$IP:3000"
echo ""
echo "To accept certificate warning:"
echo "1. Browser will show 'Your connection is not private'"
echo "2. Click 'Advanced'"
echo "3. Click 'Proceed to $IP (unsafe)'"
echo ""
echo "Alternative: Use 'localhost' on the server itself (no HTTPS needed)"
