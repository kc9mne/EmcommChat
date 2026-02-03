module.exports = {
  // Server configuration
  server: {
    port: 3000,
    host: '0.0.0.0',
    enableHttps: false,  // Set to true to enable HTTPS (required for voice on mobile)
    sslKeyPath: './ssl/key.pem',
    sslCertPath: './ssl/cert.pem'
  },

  // Admin credentials (CHANGE THESE!)
  admin: {
    username: 'admin',
    password: 'changeme123'  // CHANGE THIS IMMEDIATELY
  },

  // Message history retention
  retention: {
    messageHistoryDays: 7,  // Keep messages for 7 days (change to 1 for 24 hours)
    cleanupIntervalHours: 6  // Run cleanup every 6 hours
  },

  // User settings
  user: {
    nicknameMinLength: 4,  // Changed from 8 to 4 for ham callsigns
    nicknameMaxLength: 16,
    allowAnonymous: false  // Require nickname to connect
  },

  // File upload settings
  uploads: {
    maxFileSize: 10 * 1024 * 1024,  // 10MB max file size
    maxImageSize: 5 * 1024 * 1024,   // 5MB max image size
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip'],
    uploadPath: './uploads',
    imagePath: './uploads/images'
  },

  // Map tile configuration
  maps: {
    tilePath: './map-tiles',  // Path to offline map tiles
    defaultZoom: 13,
    maxZoom: 15,
    minZoom: 1,
    // Default center (change to your operating area)
    defaultCenter: {
      lat: 41.8781,  // Chicago area
      lng: -87.6298
    }
  },

  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 100       // Max 100 requests per minute per IP
  },

  // Profanity filter
  profanityFilter: {
    enabled: true,
    customWords: []  // Add custom words to filter here
  }
};
