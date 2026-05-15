const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'grid.db'));

// WAL mode = fast concurrent reads while writing
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    tile_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tiles (
    id INTEGER PRIMARY KEY,
    owner_id TEXT REFERENCES users(id),
    owner_name TEXT,
    color TEXT,
    captured_at TEXT,
    version INTEGER DEFAULT 0
  );
`);

// Seed 1000 empty tiles (40×25) on first run
const count = db.prepare('SELECT COUNT(*) as c FROM tiles').get().c;
if (count === 0) {
  const insert = db.prepare('INSERT INTO tiles (id) VALUES (?)');
  const seed = db.transaction(() => {
    for (let i = 0; i < 1000; i++) insert.run(i);
  });
  seed();
  console.log('Seeded 1000 tiles');
}

module.exports = db;