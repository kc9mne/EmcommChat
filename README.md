# EmComm Chat - Emergency Communications Platform

Offline-first emergency communications platform for text chat, direct messaging, file sharing, and location tracking.

## Features

- 📱 **Real-time Chat**: Multiple chat rooms and direct messaging
- 📍 **Location Sharing**: Share GPS coordinates with offline maps
- 🖼️ **Image Sharing**: Upload and share images inline in chat
- 📁 **File Sharing**: Upload and download files with web-based file browser
- 👥 **User Management**: Nickname-based identification with blocking capabilities
- 🔒 **Admin Controls**: Create/delete rooms, kick users, delete messages
- 🗑️ **Auto-Cleanup**: Configurable message retention (1-7 days)
- 🚫 **Content Filtering**: Built-in profanity filter
- 🌐 **Offline Maps**: Support for locally-hosted map tiles

## Requirements

- Node.js 14+ (18+ recommended)
- 2GB RAM minimum
- 32GB storage (recommended for map tiles and uploads)
- Linux-based SBC (Raspberry Pi 4/5, Orange Pi, etc.) or any computer

## Quick Start

### 1. Installation

```bash
# Install Node.js if not already installed (on Debian/Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Navigate to project directory
cd emcomm-chat

# Install dependencies
npm install
```

### 2. Configuration

Edit `config.js` to customize your deployment:

```javascript
module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'  // Listen on all interfaces
  },
  
  admin: {
    username: 'admin',
    password: 'CHANGE_THIS_PASSWORD'  // ⚠️ CHANGE IMMEDIATELY
  },
  
  retention: {
    messageHistoryDays: 7,  // Keep messages for 7 days
  },
  
  // ... other settings
};
```

**IMPORTANT**: Change the default admin password before deployment!

### 3. Run the Server

```bash
# Start the server
npm start

# Or use a process manager (recommended for production)
npm install -g pm2
pm2 start server.js --name emcomm-chat
pm2 save
```

The server will start on `http://localhost:3000` (or your configured port).

### 4. Access the Interface

Open a web browser and navigate to:
- Local: `http://localhost:3000`
- Network: `http://YOUR_SBC_IP:3000`

Users can connect from any device on your network.

## Offline Map Setup

To enable offline maps, you need to download map tiles for your operating area.

### Option 1: Using QGIS and QMetaTiles

1. Install QGIS: https://qgis.org/
2. Install QMetaTiles plugin
3. Select your area of interest
4. Export tiles (zoom levels 1-15 recommended)
5. Copy tiles to `./map-tiles/` directory

### Option 2: Using Mobile Atlas Creator (MOBAC)

1. Download MOBAC: https://mobac.sourceforge.io/
2. Select "OSM Mapnik" as source
3. Select your region
4. Choose zoom levels 1-15
5. Export in "PNG tiles" format
6. Copy to `./map-tiles/{z}/{x}/{y}.png` structure

### Option 3: Tile Downloader Script

We've included a simple tile downloader (requires Python):

```bash
# Install dependencies
pip3 install requests pillow

# Download tiles for a bounding box
# Format: python3 download-tiles.py MIN_LAT MIN_LON MAX_LAT MAX_LON MIN_ZOOM MAX_ZOOM
python3 download-tiles.py 41.8 -87.7 41.9 -87.6 10 15

# Example: Chicago area
python3 download-tiles.py 41.6 -88.0 42.0 -87.5 1 14
```

**Storage Requirements:**
- Zoom 1-10: ~50MB
- Zoom 1-12: ~200MB
- Zoom 1-14: ~1GB
- Zoom 1-15: ~3-5GB (recommended for detailed local coverage)

## Deployment on SBC

### Systemd Service Setup

Create a systemd service for automatic startup:

```bash
# Create service file
sudo nano /etc/systemd/system/emcomm-chat.service
```

Add the following content:

```ini
[Unit]
Description=EmComm Chat Emergency Communications Platform
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/emcomm-chat
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable emcomm-chat
sudo systemctl start emcomm-chat
sudo systemctl status emcomm-chat
```

### Using PM2 (Alternative)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name emcomm-chat

# Setup PM2 to start on boot
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs emcomm-chat
```

## Network Configuration

For emergency communications deployment:

### Local Network (WiFi Hotspot)

```bash
# Install hostapd and dnsmasq
sudo apt-get install hostapd dnsmasq

# Configure WiFi access point
# Edit /etc/hostapd/hostapd.conf

# Configure DHCP
# Edit /etc/dnsmasq.conf
```

### Static IP Configuration

```bash
# Edit network configuration
sudo nano /etc/dhcpcd.conf

# Add:
interface wlan0
static ip_address=192.168.10.1/24
static routers=192.168.10.1
```

### Firewall Rules

```bash
# Allow incoming connections on port 3000
sudo ufw allow 3000/tcp
sudo ufw enable
```

## Usage

### For Users

1. **Join Network**: Enter a nickname (8-16 characters)
2. **Select Room**: Click on a room in the Rooms tab
3. **Send Messages**: Type and press Enter or click Send
4. **Share Images**: Click the image icon (🖼️)
5. **Share Location**: Click the location icon (📍)
6. **Direct Messages**: Go to Users tab, click a user
7. **Upload Files**: Go to Files tab, click Upload File

### For Administrators

1. **Access Admin Panel**: Click the settings icon (⚙️)
2. **Login**: Use configured admin credentials
3. **Create Rooms**: Enter room name and click Create
4. **Kick Users**: Select user from dropdown and confirm
5. **Delete Messages**: (Currently done via database access)

## File Structure

```
emcomm-chat/
├── server.js           # Main server application
├── database.js         # SQLite database layer
├── config.js           # Configuration file
├── package.json        # Node.js dependencies
├── public/             # Frontend files
│   ├── index.html      # Main HTML interface
│   ├── style.css       # Stylesheet
│   └── app.js          # Client-side JavaScript
├── data/               # SQLite database (created automatically)
├── uploads/            # File uploads (created automatically)
│   └── images/         # Image uploads
├── map-tiles/          # Offline map tiles (you provide)
└── README.md           # This file
```

## Maintenance

### View Logs

```bash
# If using PM2
pm2 logs emcomm-chat

# If using systemd
sudo journalctl -u emcomm-chat -f

# Application logs
tail -f /home/claude/emcomm-chat/logs/*.log
```

### Database Backup

```bash
# Backup database
cp data/emcomm.db data/emcomm-backup-$(date +%Y%m%d).db

# Backup uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

### Manual Cleanup

```bash
# Clean old messages (older than 7 days)
sqlite3 data/emcomm.db "DELETE FROM messages WHERE created_at < datetime('now', '-7 days');"

# Clean old files
find uploads/ -type f -mtime +7 -delete
```

### Disk Space Monitoring

```bash
# Check disk usage
df -h

# Check upload directory size
du -sh uploads/

# Check database size
du -sh data/
```

## Troubleshooting

### Cannot Connect to Server

1. Check if server is running: `sudo systemctl status emcomm-chat`
2. Check firewall: `sudo ufw status`
3. Verify port is not in use: `sudo netstat -tulpn | grep 3000`
4. Check logs for errors

### Map Tiles Not Loading

1. Verify tiles exist in `./map-tiles/` directory
2. Check tile structure: `{z}/{x}/{y}.png`
3. Verify file permissions: `chmod -R 755 map-tiles/`
4. Check browser console for tile load errors

### File Upload Fails

1. Check disk space: `df -h`
2. Verify upload directory permissions: `chmod -R 755 uploads/`
3. Check file size limits in `config.js`
4. Review server logs for errors

### High Memory Usage

1. Reduce message retention days in `config.js`
2. Run manual cleanup
3. Limit max concurrent connections
4. Increase SBC swap space

## Security Considerations

⚠️ **Important**: This application is designed for offline emergency use and does not include:

- User authentication (beyond nicknames)
- Message encryption
- HTTPS/TLS (add nginx reverse proxy if needed)
- Protection against malicious users on the network

For deployment scenarios where security is critical:

1. **Change admin password immediately**
2. **Use behind a firewall** - only allow trusted network access
3. **Consider adding nginx reverse proxy** with basic auth
4. **Regularly backup the database**
5. **Monitor for abuse** using admin controls

## Performance Tuning

For better performance on resource-constrained SBCs:

```javascript
// In config.js
retention: {
  messageHistoryDays: 1,  // Reduce to 24 hours
  cleanupIntervalHours: 3  // More frequent cleanup
},

uploads: {
  maxFileSize: 5 * 1024 * 1024,  // Reduce max file size
}
```

Consider using:
- SQLite write-ahead logging (WAL mode)
- Nginx as reverse proxy for static file serving
- Redis for session management (advanced)

## Contributing

This is a purpose-built emergency communications tool. Contributions welcome for:

- Bug fixes
- Performance improvements
- Additional offline features
- Better map tile management
- Enhanced admin controls

## License

MIT License - Use freely for emergency communications

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Check GitHub issues (if hosted on GitHub)

## Credits

Built for emergency communications scenarios where traditional infrastructure may be unavailable.

Uses:
- Socket.io for real-time communication
- Leaflet.js for mapping
- SQLite for data storage
- Express.js for web server
