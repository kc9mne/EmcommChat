# Example Configuration Scenarios

## Scenario 1: Hurricane Response (7-Day Event)

```javascript
// config.js
module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },

  admin: {
    username: 'admin',
    password: 'HurricaneResponse2024!'
  },

  retention: {
    messageHistoryDays: 7,  // Keep full week of communications
    cleanupIntervalHours: 12
  },

  user: {
    nicknameMinLength: 8,
    nicknameMaxLength: 16,
    allowAnonymous: false
  },

  uploads: {
    maxFileSize: 10 * 1024 * 1024,
    maxImageSize: 5 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
    uploadPath: './uploads',
    imagePath: './uploads/images'
  },

  maps: {
    tilePath: './map-tiles',
    defaultZoom: 13,
    maxZoom: 15,
    minZoom: 8,
    defaultCenter: {
      lat: 29.7604,  // Houston
      lng: -95.3698
    }
  }
};
```

**Map tiles to download:**
```bash
# Houston metro area, zoom 1-15 for detailed coverage
python3 download-tiles.py 29.5 -95.7 30.0 -95.0 1 15
```

---

## Scenario 2: Search and Rescue (24-Hour Operations)

```javascript
// config.js
module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },

  admin: {
    username: 'sar-admin',
    password: 'SAR-Ops-2024!'
  },

  retention: {
    messageHistoryDays: 1,  // 24-hour rolling window
    cleanupIntervalHours: 6
  },

  user: {
    nicknameMinLength: 8,
    nicknameMaxLength: 16,
    allowAnonymous: false
  },

  uploads: {
    maxFileSize: 20 * 1024 * 1024,  // Larger for field photos
    maxImageSize: 10 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    uploadPath: './uploads',
    imagePath: './uploads/images'
  },

  maps: {
    tilePath: './map-tiles',
    defaultZoom: 14,  // Higher default for detailed terrain
    maxZoom: 16,
    minZoom: 10,
    defaultCenter: {
      lat: 39.7392,  // Denver (mountain SAR example)
      lng: -104.9903
    }
  }
};
```

**Map tiles to download:**
```bash
# Local area only, high detail
python3 download-tiles.py 39.5 -105.3 40.0 -104.7 10 16
```

---

## Scenario 3: Community Emergency (Low Resources)

```javascript
// config.js - Optimized for Raspberry Pi Zero or low-power SBC
module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },

  admin: {
    username: 'admin',
    password: 'Community2024!'
  },

  retention: {
    messageHistoryDays: 3,
    cleanupIntervalHours: 4
  },

  user: {
    nicknameMinLength: 8,
    nicknameMaxLength: 16,
    allowAnonymous: false
  },

  uploads: {
    maxFileSize: 5 * 1024 * 1024,   // Smaller limits
    maxImageSize: 2 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    uploadPath: './uploads',
    imagePath: './uploads/images'
  },

  maps: {
    tilePath: './map-tiles',
    defaultZoom: 13,
    maxZoom: 14,  // Lower max zoom to save space
    minZoom: 10,
    defaultCenter: {
      lat: 41.8781,  // Chicago
      lng: -87.6298
    }
  }
};
```

**Map tiles to download:**
```bash
# Minimal coverage, zoom 10-14 only
python3 download-tiles.py 41.7 -87.8 42.0 -87.5 10 14
```

---

## Scenario 4: Mobile Command Post (Multi-Region)

```javascript
// config.js
module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },

  admin: {
    username: 'command',
    password: 'MobileOps2024!'
  },

  retention: {
    messageHistoryDays: 5,
    cleanupIntervalHours: 8
  },

  user: {
    nicknameMinLength: 8,
    nicknameMaxLength: 16,
    allowAnonymous: false
  },

  uploads: {
    maxFileSize: 15 * 1024 * 1024,
    maxImageSize: 8 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/zip'],
    uploadPath: './uploads',
    imagePath: './uploads/images'
  },

  maps: {
    tilePath: './map-tiles',
    defaultZoom: 12,
    maxZoom: 15,
    minZoom: 5,  // Lower minimum for regional coverage
    defaultCenter: {
      lat: 39.8283,  // Center of USA
      lng: -98.5795
    }
  }
};
```

**Map tiles to download:**
```bash
# Multiple regions - download separately then combine

# Major metro areas at high detail
python3 download-tiles.py 40.5 -74.3 40.9 -73.7 1 15  # NYC
python3 download-tiles.py 33.9 -118.5 34.3 -118.1 1 15  # LA
python3 download-tiles.py 41.7 -87.8 42.0 -87.5 1 15  # Chicago

# Interstate corridors at medium detail
python3 download-tiles.py 39.0 -99.0 40.0 -98.0 1 12  # I-70 corridor
```

---

## Scenario 5: Wildfire Response

```javascript
// config.js
module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },

  admin: {
    username: 'fire-ops',
    password: 'Wildfire2024!'
  },

  retention: {
    messageHistoryDays: 7,
    cleanupIntervalHours: 6
  },

  user: {
    nicknameMinLength: 8,
    nicknameMaxLength: 16,
    allowAnonymous: false
  },

  uploads: {
    maxFileSize: 25 * 1024 * 1024,  // Large for aerial photos
    maxImageSize: 15 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/tiff', 'application/pdf'],
    uploadPath: './uploads',
    imagePath: './uploads/images'
  },

  maps: {
    tilePath: './map-tiles',
    defaultZoom: 13,
    maxZoom: 16,
    minZoom: 8,
    defaultCenter: {
      lat: 37.7749,  // Northern California
      lng: -122.4194
    }
  },

  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 200  // Higher limit for active operations
  }
};
```

**Map tiles to download:**
```bash
# Large area coverage for fire perimeter tracking
python3 download-tiles.py 37.0 -123.0 38.5 -121.5 1 15
```

---

## Hardware Recommendations by Scenario

### Hurricane/Wildfire (Multi-day, Many Users)
- **Recommended**: Raspberry Pi 4 (4GB+) or Mini PC
- **Storage**: 64GB+ eMMC/SD card
- **Power**: Battery backup + solar
- **Network**: Long-range WiFi antenna

### Search and Rescue (Mobile, Rugged)
- **Recommended**: Raspberry Pi 4 in rugged case
- **Storage**: 32GB industrial SD card
- **Power**: Large battery pack (20,000+ mAh)
- **Network**: Directional antenna for range

### Community Emergency (Budget)
- **Recommended**: Raspberry Pi 3B+ or Zero 2 W
- **Storage**: 16GB SD card minimum
- **Power**: Small battery backup
- **Network**: Standard WiFi

### Mobile Command Post (Professional)
- **Recommended**: Mini PC (Intel NUC) or Raspberry Pi 4 (8GB)
- **Storage**: 128GB+ SSD
- **Power**: UPS + vehicle power
- **Network**: High-gain omnidirectional antenna

---

## Network Configuration Examples

### Simple WiFi Hotspot
```
SSID: EmComm-Response
Password: Emergency2024
IP Range: 192.168.10.1/24
Server: http://192.168.10.1:3000
```

### Dual Network (Internet + Local)
```
eth0 (Internet): DHCP
wlan0 (Local): 192.168.10.1/24
Server: http://192.168.10.1:3000
Bridge for internet sharing if available
```

### Mesh Network Ready
```
Interface: wlan1 (mesh)
Interface: wlan0 (access point)
IP: 192.168.10.1/24
Compatible with MikroTik mesh when needed
```
