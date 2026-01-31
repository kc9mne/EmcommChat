#!/bin/bash

echo "============================================"
echo "EmComm Chat - Quick Installation Script"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "Please do not run this script as root"
   exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✓ Node.js already installed ($(node --version))"
fi

# Install npm dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "✗ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p data uploads uploads/images map-tiles public

echo "✓ Directories created"

# Set permissions
chmod 755 download-tiles.py
chmod 644 config.js

echo "✓ Permissions set"

# Configuration reminder
echo ""
echo "============================================"
echo "Installation Complete!"
echo "============================================"
echo ""
echo "⚠️  IMPORTANT: Before starting the server:"
echo ""
echo "1. Edit config.js and change the admin password:"
echo "   nano config.js"
echo ""
echo "2. (Optional) Download map tiles for offline use:"
echo "   python3 download-tiles.py 41.6 -88.0 42.0 -87.5 1 14"
echo ""
echo "3. Start the server:"
echo "   npm start"
echo ""
echo "4. Access the application:"
echo "   http://localhost:3000"
echo "   or http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "For production deployment, see README.md"
echo ""
