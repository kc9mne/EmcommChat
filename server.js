const express = require('express');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Filter = require('bad-words');
const rateLimit = require('express-rate-limit');
const Database = require('./database');
const config = require('./config');

const app = express();

// Create HTTP or HTTPS server based on config
let server;
if (config.server.enableHttps) {
  try {
    const options = {
      key: fs.readFileSync(config.server.sslKeyPath),
      cert: fs.readFileSync(config.server.sslCertPath)
    };
    server = https.createServer(options, app);
    console.log('🔒 HTTPS enabled');
  } catch (error) {
    console.error('Failed to load SSL certificates, falling back to HTTP');
    console.error('Run ./setup-https.sh to generate certificates');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

const io = socketIo(server);
const db = new Database();
const filter = new Filter();

// Add custom words to profanity filter
if (config.profanityFilter.customWords.length > 0) {
  filter.addWords(...config.profanityFilter.customWords);
}

// Create necessary directories
const dirs = [
  './data',
  config.uploads.uploadPath,
  config.uploads.imagePath,
  config.maps.tilePath,
  './public'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(config.uploads.uploadPath));
app.use('/downloads', express.static('./public/downloads'));
app.use('/tiles', express.static(config.maps.tilePath));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests
});
app.use(limiter);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const dest = isImage ? config.uploads.imagePath : config.uploads.uploadPath;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.uploads.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (config.uploads.allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Connected users
const connectedUsers = new Map();

// Utility functions
function sanitizeText(text) {
  if (!text || text === '') return '';
  if (!config.profanityFilter.enabled) return text;
  return filter.clean(text);
}

function validateNickname(nickname) {
  if (!nickname) return false;
  const len = nickname.length;
  if (len < config.user.nicknameMinLength || len > config.user.nicknameMaxLength) {
    return false;
  }
  // Only allow alphanumeric, spaces, and basic punctuation
  return /^[a-zA-Z0-9\s\-_]+$/.test(nickname);
}

// REST API Routes

// Get all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await db.all('SELECT * FROM rooms ORDER BY created_at DESC');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get room messages
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const messages = await db.all(
      'SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.params.roomId]
    );
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get direct messages
app.get('/api/dms/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const messages = await db.all(
      `SELECT * FROM direct_messages 
       WHERE (sender_id = ? AND recipient_id = ?) 
          OR (sender_id = ? AND recipient_id = ?)
       ORDER BY created_at DESC LIMIT 100`,
      [userId, otherUserId, otherUserId, userId]
    );
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Upload image
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = '/uploads/images/' + req.file.filename;
    
    await db.run(
      'INSERT INTO files (filename, original_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      ['images/' + req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.body.userId || 'anonymous']
    );

    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload file
app.post('/api/upload/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = '/uploads/' + req.file.filename;
    
    await db.run(
      'INSERT INTO files (filename, original_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.body.userId || 'anonymous']
    );

    res.json({ 
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get files list
app.get('/api/files', async (req, res) => {
  try {
    const files = await db.all('SELECT * FROM files ORDER BY upload_date DESC');
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Delete file (admin or file owner)
app.delete('/api/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, username, password } = req.body;
    
    const file = await db.get('SELECT * FROM files WHERE id = ?', [fileId]);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if user is admin or file owner
    const isAdmin = username === config.admin.username && password === config.admin.password;
    const isOwner = file.uploaded_by === userId;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Delete physical file
    const filePath = path.join(config.uploads.uploadPath, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await db.run('DELETE FROM files WHERE id = ?', [fileId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Admin: Create room
app.post('/api/admin/rooms', async (req, res) => {
  try {
    const { username, password, roomName } = req.body;
    
    if (username !== config.admin.username || password !== config.admin.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await db.run(
      'INSERT INTO rooms (name, created_by) VALUES (?, ?)',
      [sanitizeText(roomName), 'admin']
    );

    const room = await db.get('SELECT * FROM rooms WHERE id = ?', [result.id]);
    io.emit('room_created', room);
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Admin: Delete room
app.delete('/api/admin/rooms/:roomId', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username !== config.admin.username || password !== config.admin.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await db.run('DELETE FROM messages WHERE room_id = ?', [req.params.roomId]);
    await db.run('DELETE FROM rooms WHERE id = ?', [req.params.roomId]);
    
    io.emit('room_deleted', { roomId: req.params.roomId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Admin: Delete message
app.delete('/api/admin/messages/:messageId', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username !== config.admin.username || password !== config.admin.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await db.run('DELETE FROM messages WHERE id = ?', [req.params.messageId]);
    io.emit('message_deleted', { messageId: req.params.messageId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Admin: Clear all data
app.post('/api/admin/clear-data', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username !== config.admin.username || password !== config.admin.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Clear all tables except rooms (keep General room)
    await db.run('DELETE FROM messages');
    await db.run('DELETE FROM direct_messages');
    await db.run('DELETE FROM files');
    
    // Clear upload directories
    const uploadsPath = config.uploads.uploadPath;
    const imagesPath = config.uploads.imagePath;
    
    // Delete all files in uploads
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath);
      files.forEach(file => {
        const filePath = path.join(uploadsPath, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    // Delete all files in images
    if (fs.existsSync(imagesPath)) {
      const files = fs.readdirSync(imagesPath);
      files.forEach(file => {
        const filePath = path.join(imagesPath, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.json({ success: true, message: 'All data cleared' });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// Socket.IO connection handling
const voiceRooms = new Map(); // roomId -> Set of user IDs (MUST BE GLOBAL!)

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register', async (data) => {
    const { nickname } = data;
    
    if (!validateNickname(nickname)) {
      socket.emit('error', { message: 'Invalid nickname' });
      return;
    }

    const sanitizedNickname = sanitizeText(nickname);
    connectedUsers.set(socket.id, {
      id: socket.id,
      nickname: sanitizedNickname,
      connectedAt: new Date()
    });

    await db.run(
      'INSERT OR REPLACE INTO users (id, nickname, last_seen) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [socket.id, sanitizedNickname]
    );

    socket.emit('registered', { 
      userId: socket.id, 
      nickname: sanitizedNickname 
    });

    io.emit('user_list', Array.from(connectedUsers.values()));
  });

  socket.on('join_room', (data) => {
    const { roomId } = data;
    socket.join(`room_${roomId}`);
    socket.emit('joined_room', { roomId });
  });

  socket.on('leave_room', (data) => {
    const { roomId } = data;
    socket.leave(`room_${roomId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { roomId, message, messageType, imageUrl, location } = data;
      const user = connectedUsers.get(socket.id);
      
      console.log('Received send_message:', { roomId, messageType, imageUrl, userId: socket.id, hasUser: !!user });
      
      if (!user) {
        console.error('User not found in connectedUsers for socket:', socket.id);
        socket.emit('error', { message: 'Not registered' });
        return;
      }

      const sanitizedMessage = sanitizeText(message || '');

      const result = await db.run(
        `INSERT INTO messages (room_id, sender_id, sender_nickname, message, message_type, image_url, location_lat, location_lng)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          roomId,
          user.id,
          user.nickname,
          sanitizedMessage,
          messageType || 'text',
          imageUrl || null,
          location?.lat || null,
          location?.lng || null
        ]
      );

      const newMessage = await db.get('SELECT * FROM messages WHERE id = ?', [result.id]);
      console.log('Broadcasting message to room:', roomId, newMessage.id);
      io.to(`room_${roomId}`).emit('new_message', newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('send_dm', async (data) => {
    try {
      const { recipientId, message, messageType, imageUrl, location } = data;
      const user = connectedUsers.get(socket.id);
      const recipient = connectedUsers.get(recipientId);
      
      if (!user) {
        socket.emit('error', { message: 'Not registered' });
        return;
      }

      if (!recipient) {
        socket.emit('error', { message: 'Recipient not found' });
        return;
      }

      // Check if blocked
      const blocked = await db.get(
        'SELECT * FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
        [recipientId, socket.id]
      );

      if (blocked) {
        socket.emit('error', { message: 'You are blocked by this user' });
        return;
      }

      const sanitizedMessage = sanitizeText(message || '');

      const result = await db.run(
        `INSERT INTO direct_messages (sender_id, sender_nickname, recipient_id, recipient_nickname, message, message_type, image_url, location_lat, location_lng)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.nickname,
          recipientId,
          recipient.nickname,
          sanitizedMessage,
          messageType || 'text',
          imageUrl || null,
          location?.lat || null,
          location?.lng || null
        ]
      );

      const newMessage = await db.get('SELECT * FROM direct_messages WHERE id = ?', [result.id]);
      
      socket.emit('new_dm', newMessage);
      io.to(recipientId).emit('new_dm', newMessage);
    } catch (error) {
      console.error('Error sending DM:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('block_user', async (data) => {
    try {
      const { blockedId } = data;
      const user = connectedUsers.get(socket.id);
      
      if (!user) return;

      await db.run(
        'INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)',
        [socket.id, blockedId]
      );

      socket.emit('user_blocked', { blockedId });
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  });

  socket.on('unblock_user', async (data) => {
    try {
      const { blockedId } = data;
      
      await db.run(
        'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
        [socket.id, blockedId]
      );

      socket.emit('user_unblocked', { blockedId });
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  });

  socket.on('kick_user', async (data) => {
    try {
      const { username, password, userId } = data;
      
      if (username !== config.admin.username || password !== config.admin.password) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      const targetSocket = io.sockets.sockets.get(userId);
      if (targetSocket) {
        targetSocket.emit('kicked', { message: 'You have been kicked by an administrator' });
        targetSocket.disconnect(true);
        connectedUsers.delete(userId);
        io.emit('user_list', Array.from(connectedUsers.values()));
      }
    } catch (error) {
      console.error('Error kicking user:', error);
    }
  });

  socket.on('join_voice', (data) => {
    const { roomId } = data;
    const user = connectedUsers.get(socket.id);
    
    if (!user) {
      console.log('❌ User not found in connectedUsers:', socket.id);
      return;
    }

    console.log(`\n🎤 ${user.nickname} (${socket.id}) joining voice room ${roomId}`);
    console.log(`   roomId type: ${typeof roomId}, value: ${JSON.stringify(roomId)}`);
    console.log(`   voiceRooms.has(${roomId}):`, voiceRooms.has(roomId));
    console.log(`   Current voiceRooms keys:`, Array.from(voiceRooms.keys()));

    // Add user to voice room
    if (!voiceRooms.has(roomId)) {
      console.log(`   Creating new voice room for roomId: ${roomId}`);
      voiceRooms.set(roomId, new Set());
    } else {
      console.log(`   Using existing voice room, current size:`, voiceRooms.get(roomId).size);
    }
    voiceRooms.get(roomId).add(socket.id);
    
    console.log(`📋 Voice room ${roomId} now has:`, Array.from(voiceRooms.get(roomId)));

    // Join socket room for voice signaling
    socket.join(`voice_${roomId}`);

    // Notify others in voice (not yourself!)
    socket.to(`voice_${roomId}`).emit('voice_user_joined', {
      userId: socket.id,
      nickname: user.nickname
    });

    // Build complete participants list for EVERYONE
    console.log(`🔨 Building participants list...`);
    const allParticipants = Array.from(voiceRooms.get(roomId))
      .map(userId => {
        const u = connectedUsers.get(userId);
        console.log(`  - Mapping userId ${userId} → ${u ? u.nickname : 'NOT FOUND'}`);
        return u ? { userId, nickname: u.nickname, talking: false } : null;
      })
      .filter(Boolean);
    
    console.log(`✅ All participants:`, allParticipants.map(p => p.nickname));

    // Send each user a custom list excluding themselves
    console.log(`📤 Sending participant lists...`);
    for (const userId of voiceRooms.get(roomId)) {
      const userSocket = io.sockets.sockets.get(userId);
      if (userSocket) {
        const participantsForUser = allParticipants.filter(p => p.userId !== userId);
        console.log(`  → Sending to ${connectedUsers.get(userId)?.nickname || 'unknown'} (${userId}):`, participantsForUser.map(p => p.nickname));
        userSocket.emit('voice_participants', participantsForUser);
      } else {
        console.log(`  ❌ Socket not found for userId: ${userId}`);
      }
    }
    
    console.log(`\n📊 Summary: ${user.nickname} joined voice in room ${roomId}`);
    console.log(`   Total ${allParticipants.length} users in voice\n`);
  });

  socket.on('leave_voice', (data) => {
    const { roomId } = data;
    const user = connectedUsers.get(socket.id);
    
    if (!user) return;

    // Remove from voice room
    if (voiceRooms.has(roomId)) {
      voiceRooms.get(roomId).delete(socket.id);
      
      // Broadcast updated participants to remaining users
      const participants = Array.from(voiceRooms.get(roomId)).map(userId => {
        const u = connectedUsers.get(userId);
        return u ? { userId, nickname: u.nickname, talking: false } : null;
      }).filter(Boolean);
      
      io.to(`voice_${roomId}`).emit('voice_participants', participants);
      
      if (voiceRooms.get(roomId).size === 0) {
        voiceRooms.delete(roomId);
      }
    }

    // Leave socket room
    socket.leave(`voice_${roomId}`);

    // Notify others
    socket.to(`voice_${roomId}`).emit('voice_user_left', {
      userId: socket.id,
      nickname: user.nickname
    });

    console.log(`${user.nickname} left voice in room ${roomId}`);
  });

  socket.on('voice_talking', (data) => {
    const { roomId, talking } = data;
    const user = connectedUsers.get(socket.id);
    
    if (!user) return;
    
    // Broadcast talking status to EVERYONE in voice (including sender)
    io.to(`voice_${roomId}`).emit('voice_talking_update', {
      userId: socket.id,
      nickname: user.nickname,
      talking
    });
  });

  // WebRTC signaling
  socket.on('voice_offer', (data) => {
    const { to, offer } = data;
    io.to(to).emit('voice_offer', {
      from: socket.id,
      offer
    });
  });

  socket.on('voice_answer', (data) => {
    const { to, answer } = data;
    io.to(to).emit('voice_answer', {
      from: socket.id,
      answer
    });
  });

  socket.on('voice_ice_candidate', (data) => {
    const { to, candidate } = data;
    io.to(to).emit('voice_ice_candidate', {
      from: socket.id,
      candidate
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove from all voice rooms
    voiceRooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(`voice_${roomId}`).emit('voice_user_left', {
          userId: socket.id
        });
      }
    });
    
    connectedUsers.delete(socket.id);
    io.emit('user_list', Array.from(connectedUsers.values()));
  });
});

// Initialize database and start server
async function start() {
  try {
    await db.init();
    
    // Schedule cleanup
    setInterval(() => {
      db.cleanup(config.retention.messageHistoryDays);
    }, config.retention.cleanupIntervalHours * 60 * 60 * 1000);

    server.listen(config.server.port, config.server.host, () => {
      const protocol = config.server.enableHttps ? 'https' : 'http';
      console.log(`EmComm Chat Server running on ${config.server.host}:${config.server.port}`);
      console.log(`Access the interface at ${protocol}://localhost:${config.server.port}`);
      if (config.server.enableHttps) {
        console.log(`⚠️  Using self-signed certificate - browsers will show a warning`);
      } else {
        console.log(`ℹ️  Running HTTP - voice features require HTTPS on mobile devices`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();