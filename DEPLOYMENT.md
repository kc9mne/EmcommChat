# EmComm Chat - Deployment Quick Reference

## Initial Setup (5 Minutes)

```bash
# 1. Clone or copy files to your SBC
cd /home/yourusername

# 2. Run installation script
chmod +x install.sh
./install.sh

# 3. Edit configuration
nano config.js
# Change admin password!

# 4. Start server
npm start
```

Access: `http://YOUR_SBC_IP:3000`

## Production Deployment with PM2

```bash
# Install PM2
sudo npm install -g pm2

# Start application
cd /home/yourusername/emcomm-chat
pm2 start server.js --name emcomm-chat

# Configure startup
pm2 startup
# Run the command it outputs
pm2 save

# Useful PM2 commands
pm2 status          # Check status
pm2 logs            # View logs
pm2 restart all     # Restart
pm2 stop all        # Stop
pm2 delete all      # Remove from PM2
```

## Production Deployment with Systemd

```bash
# 1. Edit service file
nano emcomm-chat.service
# Update paths and username

# 2. Copy to systemd
sudo cp emcomm-chat.service /etc/systemd/system/

# 3. Enable and start
sudo systemctl enable emcomm-chat
sudo systemctl start emcomm-chat

# 4. Check status
sudo systemctl status emcomm-chat

# View logs
sudo journalctl -u emcomm-chat -f
```

## Download Map Tiles

```bash
# Install Python dependencies
pip3 install requests

# Download for your area (example: Chicago)
python3 download-tiles.py 41.6 -88.0 42.0 -87.5 1 14

# Smaller test area (faster download)
python3 download-tiles.py 41.85 -87.70 41.90 -87.60 10 13
```

**Zoom Level Guide:**
- 1-10: Country/state level (~50MB)
- 1-12: City level (~200MB)  
- 1-14: Neighborhood level (~1GB)
- 1-15: Street level (~3-5GB) ← Recommended

## WiFi Access Point Setup (Raspberry Pi)

```bash
# Install packages
sudo apt-get install hostapd dnsmasq

# Configure hostapd
sudo nano /etc/hostapd/hostapd.conf
```

Add:
```
interface=wlan0
driver=nl80211
ssid=EmComm-Network
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=EmergencyComms2024
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
```

```bash
# Configure dnsmasq
sudo nano /etc/dnsmasq.conf
```

Add:
```
interface=wlan0
dhcp-range=192.168.10.10,192.168.10.100,255.255.255.0,24h
```

```bash
# Set static IP for wlan0
sudo nano /etc/dhcpcd.conf
```

Add:
```
interface wlan0
static ip_address=192.168.10.1/24
nohook wpa_supplicant
```

```bash
# Enable services
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq

# Reboot
sudo reboot
```

After reboot:
- SSID: `EmComm-Network`
- Password: `EmergencyComms2024`
- Server: `http://192.168.10.1:3000`

## Common Configuration Changes

### Change Message Retention

Edit `config.js`:
```javascript
retention: {
  messageHistoryDays: 1,  // 24 hours only
}
```

### Change Server Port

Edit `config.js`:
```javascript
server: {
  port: 8080,  // Use different port
}
```

### Increase File Upload Size

Edit `config.js`:
```javascript
uploads: {
  maxFileSize: 20 * 1024 * 1024,  // 20MB
  maxImageSize: 10 * 1024 * 1024,  // 10MB
}
```

## Monitoring and Maintenance

### Check Disk Space
```bash
df -h
du -sh uploads/
du -sh data/
```

### Backup Data
```bash
# Backup database
cp data/emcomm.db backups/emcomm-$(date +%Y%m%d).db

# Backup uploads
tar -czf backups/uploads-$(date +%Y%m%d).tar.gz uploads/
```

### Clean Old Data
```bash
# Via SQLite
sqlite3 data/emcomm.db "DELETE FROM messages WHERE created_at < datetime('now', '-1 days');"

# Or restart server (automatic cleanup runs)
pm2 restart emcomm-chat
```

### View System Resources
```bash
# CPU and memory
htop

# PM2 monitoring
pm2 monit

# Network connections
sudo netstat -tulpn | grep 3000
```

## Troubleshooting

### Server Won't Start
```bash
# Check if port is in use
sudo netstat -tulpn | grep 3000

# Check logs
pm2 logs
# or
sudo journalctl -u emcomm-chat -n 50

# Verify Node.js version
node --version  # Should be 14+
```

### Can't Connect from Other Devices
```bash
# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp

# Verify server is listening on all interfaces
netstat -tulpn | grep 3000
# Should show 0.0.0.0:3000 not 127.0.0.1:3000
```

### Map Tiles Not Loading
```bash
# Check tiles directory
ls -la map-tiles/

# Verify structure: map-tiles/Z/X/Y.png
ls map-tiles/10/

# Check permissions
chmod -R 755 map-tiles/
```

### High Memory Usage
```bash
# Check current usage
free -h

# Reduce retention period in config.js
# Restart server
pm2 restart emcomm-chat
```

## Security Hardening

```bash
# Change admin password in config.js
nano config.js

# Setup firewall
sudo ufw enable
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp  # SSH

# Disable SSH password auth (use keys only)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh

# Keep system updated
sudo apt update && sudo apt upgrade -y
```

## Performance Optimization

For Raspberry Pi or low-power SBCs:

```javascript
// config.js
retention: {
  messageHistoryDays: 1,
  cleanupIntervalHours: 3
},

uploads: {
  maxFileSize: 5 * 1024 * 1024,
  maxImageSize: 2 * 1024 * 1024
}
```

Add swap space:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## IP Address Configuration

### Find Your IP Address
```bash
hostname -I
ip addr show
```

### Set Static IP (Ethernet)
```bash
sudo nano /etc/dhcpcd.conf
```

Add:
```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8
```

```bash
sudo reboot
```

## Quick Commands Reference

```bash
# Start server
npm start
pm2 start server.js --name emcomm-chat

# Stop server  
pm2 stop emcomm-chat
sudo systemctl stop emcomm-chat

# View logs
pm2 logs emcomm-chat
sudo journalctl -u emcomm-chat -f

# Restart server
pm2 restart emcomm-chat
sudo systemctl restart emcomm-chat

# Check status
pm2 status
sudo systemctl status emcomm-chat

# Update code
git pull  # if using git
pm2 restart emcomm-chat

# Backup
tar -czf emcomm-backup.tar.gz emcomm-chat/
```
