# HTTPS Setup for Voice/PTT Features

## Why HTTPS is Needed

Modern browsers (Chrome, Firefox, Safari) require HTTPS to access the microphone on mobile devices and remote computers. This is a security feature to prevent malicious websites from accessing your microphone without permission.

**Exception:** `localhost` and `127.0.0.1` work without HTTPS (only when accessing from the same computer as the server).

## Quick Setup

### Option 1: Self-Signed Certificate (Easiest)

1. Run the setup script:
```bash
./setup-https.sh
```

2. Edit `config.js` and set:
```javascript
enableHttps: true
```

3. Restart the server:
```bash
npm start
```

4. Access via `https://YOUR_IP:3000`

5. **Accept the browser warning:**
   - Browser will say "Your connection is not private"
   - Click "Advanced"
   - Click "Proceed to [IP] (unsafe)"
   - This is safe for local networks!

**Each device/browser needs to accept the warning once.**

### Option 2: mkcert (Trusted Local Certificates)

For a better experience with no browser warnings:

1. Install mkcert:
```bash
# Debian/Ubuntu
sudo apt install mkcert

# Or download from: https://github.com/FiloSottile/mkcert
```

2. Install local CA:
```bash
mkcert -install
```

3. Generate certificates:
```bash
mkdir -p ssl
mkcert -key-file ssl/key.pem -cert-file ssl/cert.pem YOUR_IP localhost 127.0.0.1
```

4. Enable HTTPS in `config.js`:
```javascript
enableHttps: true
```

5. Restart server and access via `https://YOUR_IP:3000`

**Note:** You'll need to install the CA on each device that accesses the server.

### Option 3: Access from Server Only (No HTTPS Needed)

If you only need voice on the computer running the server:

1. Access via `http://localhost:3000` or `http://127.0.0.1:3000`
2. Microphone will work without HTTPS
3. Other devices on the network can still use text/images/files via HTTP

## Testing Voice/PTT

Once HTTPS is working:

1. Join a room
2. Click the 🎤 button
3. Allow microphone access when prompted
4. Hold the PTT button or spacebar to talk
5. Open another browser/device to test two-way audio

## Troubleshooting

**"Microphone access denied"**
- Make sure you're using HTTPS (or localhost)
- Check browser permissions: Settings → Privacy → Microphone
- Try a different browser

**"Certificate error" on mobile**
- Accept the certificate warning (tap Advanced → Proceed)
- Or use mkcert and install CA on mobile device

**"Voice not working between devices"**
- Both devices must be in the same room
- Both must click the voice button
- Check that firewall isn't blocking WebRTC
- Try using Google's public STUN server (already configured)

## HTTP Mode (No Voice)

If you don't need voice features, you can keep HTTPS disabled:

```javascript
enableHttps: false  // in config.js
```

All other features (text, images, files, location) work fine over HTTP.
