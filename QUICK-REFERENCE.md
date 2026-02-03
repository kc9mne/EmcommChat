# EmComm Chat - Quick Reference

## Web Mode vs Electron Mode

### Web Mode (Default)
```bash
npm start
# Access: http://localhost:3000
# or: https://localhost:3000 (if HTTPS enabled)
```
- ✅ Works on any device with browser
- ✅ Easy to access, no installation
- ❌ Mobile requires HTTPS for voice (encrypted)
- **Use for:** Your van project, civilian users

### Electron Mode (Desktop App)
```bash
./setup-electron.sh      # First time setup
npm run electron         # Run the app
npm run build-windows    # Build installer
```
- ✅ Voice works without HTTPS (ham compliant!)
- ✅ Standalone app, no browser needed
- ✅ No encryption required
- ❌ Requires installation
- **Use for:** Ham radio operations, field deployment

## Mode Switching

**Switch to Electron:**
```bash
./setup-electron.sh
npm run electron
```

**Switch to Web:**
```bash
cp package-web.json package.json
npm start
```

## Voice/PTT Features

### Requirements by Platform:

| Platform | Web (HTTP) | Web (HTTPS) | Electron |
|----------|------------|-------------|----------|
| Desktop (localhost) | ✅ | ✅ | ✅ |
| Desktop (remote) | ❌ | ✅ | ✅ |
| Android (remote) | ❌ | ✅ | ✅* |
| iPhone (remote) | ❌ | ✅ | ❌ |

*Requires Capacitor build

### Ham Radio Compliance:

- **Electron App**: ✅ FCC compliant (no encryption)
- **Web HTTPS**: ❌ Not compliant (encrypted)
- **Web HTTP**: ✅ Compliant but voice limited to localhost

## Feature Support Matrix

| Feature | Web | Electron |
|---------|-----|----------|
| Text chat | ✅ | ✅ |
| Image sharing | ✅ | ✅ |
| File sharing | ✅ | ✅ |
| Location sharing | ✅ | ✅ |
| Voice/PTT (desktop) | ⚠️ | ✅ |
| Voice/PTT (mobile) | ⚠️ | ✅* |
| Offline maps | ✅ | ✅ |
| No encryption | ✅ | ✅ |

⚠️ = Requires HTTPS (encrypted)
✅* = Android only (Capacitor build needed)

## Recommended Deployments

### Your Van (Non-Ham)
- Web mode with HTTPS
- Full voice support on all devices
- Easy for civilians/first responders

### Ham Radio Field Ops
- Electron app on laptops
- HTTP between devices (no encryption)
- FCC compliant
- Voice works everywhere

### Mixed Use
- Web server running HTTP
- Electron apps for operators needing voice
- Text/images/files work for everyone
- Voice only for Electron users

## Configuration

Edit `config.js`:

```javascript
server: {
  enableHttps: false,  // true for your van, false for ham use
  port: 3000
},
user: {
  nicknameMinLength: 4  // Short callsigns OK
}
```

## Building Installers

```bash
# Windows
npm run build-windows
# Output: dist/EmComm Chat Setup.exe

# Mac  
npm run build-mac
# Output: dist/EmComm Chat.dmg

# Linux
npm run build-linux
# Output: dist/EmComm Chat.AppImage

# All platforms
npm run build-all
```

## Port Information

- **3000**: Main app server
- **WebRTC**: Dynamic peer-to-peer (no server port)
- **Map tiles**: Served from main port

## Getting Help

- `ELECTRON-GUIDE.md` - Full Electron documentation
- `HTTPS-SETUP.md` - HTTPS setup for web mode
- `README.md` - General usage
- `DEPLOYMENT.md` - Deployment options
