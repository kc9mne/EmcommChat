const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = './data/emcomm.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Rooms table
      `CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER,
        sender_id TEXT NOT NULL,
        sender_nickname TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        image_url TEXT,
        location_lat REAL,
        location_lng REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )`,

      // Direct messages table
      `CREATE TABLE IF NOT EXISTS direct_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        sender_nickname TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        recipient_nickname TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        image_url TEXT,
        location_lat REAL,
        location_lng REAL,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Users table (active connections)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Blocked users table
      `CREATE TABLE IF NOT EXISTS blocked_users (
        blocker_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (blocker_id, blocked_id)
      )`,

      // Files table
      `CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        uploaded_by TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id)`,
      `CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages(recipient_id)`,
      `CREATE INDEX IF NOT EXISTS idx_dm_created ON direct_messages(created_at)`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // Create default "General" room
    await this.run(
      'INSERT OR IGNORE INTO rooms (name, created_by) VALUES (?, ?)',
      ['General', 'system']
    );

    console.log('Database tables initialized');
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async cleanup(retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoff = cutoffDate.toISOString();

    await this.run('DELETE FROM messages WHERE created_at < ?', [cutoff]);
    await this.run('DELETE FROM direct_messages WHERE created_at < ?', [cutoff]);

    console.log(`Cleaned up messages older than ${retentionDays} days`);
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Database;
