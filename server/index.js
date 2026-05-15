const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// ─── Helper ────────────────────────────────────────────────
const COLORS = [
  '#FF6B6B', '#FF8E53', '#FFC300', '#6BCB77',
  '#4D96FF', '#C77DFF', '#FF6FC8', '#00D4AA',
  '#FF4757', '#2ED573', '#1E90FF', '#FF6348',
  '#7BED9F', '#70A1FF', '#ECCC68', '#FF4500',
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// ─── REST endpoint: load full grid on page open ─────────────
app.get('/api/tiles', (req, res) => {
  const tiles = db.prepare('SELECT * FROM tiles').all();
  res.json(tiles);
});

// ─── REST endpoint: leaderboard ─────────────────────────────
app.get('/api/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.color, COUNT(t.id) as tiles
    FROM users u
    LEFT JOIN tiles t ON t.owner_id = u.id
    GROUP BY u.id
    ORDER BY tiles DESC
    LIMIT 10
  `).all();
  res.json(rows);
});

// ─── Track cooldowns in memory (per socket) ─────────────────
const cooldowns = new Map(); // userId → timestamp

// ─── WebSocket logic ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // Step 1: User sends their name, server registers them
  socket.on('register', ({ name }) => {
    if (!name || name.trim().length === 0) return;

    const id = uuidv4();
    const color = randomColor();
    const cleanName = name.trim().slice(0, 20);

    db.prepare(
      'INSERT INTO users (id, name, color) VALUES (?, ?, ?)'
    ).run(id, cleanName, color);

    socket.userId = id;
    socket.userColor = color;
    socket.userName = cleanName;

    socket.emit('registered', { id, color, name: cleanName });

    // Send current online count to everyone
    io.emit('online_count', io.engine.clientsCount);
    console.log(`Registered: ${cleanName} (${color})`);
  });

  // Step 2: User clicks a tile
  socket.on('claim_tile', ({ tileId, version }) => {
    if (!socket.userId) return;
    if (typeof tileId !== 'number' || tileId < 0 || tileId > 999) return;

    // Cooldown: 400ms between claims
    const lastClaim = cooldowns.get(socket.userId) || 0;
    const now = Date.now();
    if (now - lastClaim < 400) {
      socket.emit('cooldown', { remaining: 400 - (now - lastClaim) });
      return;
    }

    // Atomic update with version check (conflict guard)
    const result = db.prepare(`
      UPDATE tiles
      SET owner_id   = ?,
          owner_name = ?,
          color      = ?,
          captured_at = datetime('now'),
          version    = version + 1
      WHERE id = ?
        AND (version = ? OR owner_id IS NULL)
    `).run(socket.userId, socket.userName, socket.userColor, tileId, version ?? 0);

    if (result.changes === 0) {
      // Conflict: tile was already updated by someone else
      socket.emit('claim_rejected', { tileId });
      return;
    }

    cooldowns.set(socket.userId, now);

    // Broadcast to ALL connected clients (including sender)
    io.emit('tile_update', {
      tileId,
      color: socket.userColor,
      ownerName: socket.userName,
      ownerId: socket.userId,
      version: (version ?? 0) + 1,
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    io.emit('online_count', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});