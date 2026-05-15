# 🎮 Grid Wars — Project README



<img width="943" height="472" alt="Screenshot 2026-05-15 202003" src="https://github.com/user-attachments/assets/fdd01581-81da-486b-8c1b-6aefcf92d30e" />
<img width="929" height="473" alt="Screenshot 2026-05-15 201951" src="https://github.com/user-attachments/assets/72754466-2dc9-42f8-ae71-e24c638e1308" />


A real-time multiplayer tile-capturing game. Players click tiles on a shared grid to claim them. Everyone online sees changes instantly.

---

## 📁 Project Structure at a Glance

```
grid-app/
├── server/              ← The backend (Node.js)
│   ├── index.js
│   ├── db.js
│   ├── package.json
│   └── grid.db          ← auto-created when you run the server
│
└── client/              ← The frontend (React)
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── index.css
        ├── components/
        │   ├── Grid.jsx
        │   ├── Tile.jsx
        │   └── Leaderboard.jsx
        └── hooks/
            └── useSocket.js
```

---

## 🖥️ SERVER FOLDER (`/server`)

This is the brain of the app. It runs on your computer, manages all the data, and talks to every player in real time.

---

### `server/index.js` — The Main Server File

**What it does:** This is the most important file in the whole project. It does three things:

1. **Runs an Express web server** — handles normal web requests like "give me all the tiles"
2. **Runs a Socket.io server** — manages real-time connections with every player's browser
3. **Contains all the game logic** — registering users, claiming tiles, handling conflicts, broadcasting updates

**Key parts inside this file:**

| Part | What it does |
|---|---|
| `app.get('/api/tiles')` | When a player opens the site, their browser asks for all 1000 tiles. This sends them. |
| `app.get('/api/leaderboard')` | Returns the top 10 players sorted by how many tiles they own. |
| `io.on('connection')` | Runs every time a new player opens the site in their browser. |
| `socket.on('register')` | When a player types their name and clicks Join, this saves them to the database and gives them a random color. |
| `socket.on('claim_tile')` | When a player clicks a tile, this checks if it's allowed (cooldown, conflicts), saves it, and tells everyone about it. |
| `io.emit('tile_update')` | Sends the tile change to **every single player** connected right now — this is how real-time works. |
| `cooldowns` Map | Stores when each player last clicked, so they can't spam-click faster than 400ms. |

**Simple flow:** Player clicks tile → browser sends `claim_tile` event → server checks cooldown → server writes to database → server shouts `tile_update` to everyone → all browsers update that tile's color.

---

### `server/db.js` — The Database Setup File

**What it does:** Sets up the SQLite database (a simple file-based database). This file runs once when the server starts and makes sure all the tables exist and are ready.

**What it creates:**

- **`users` table** — stores every player's ID, name, color, and when they joined
- **`tiles` table** — stores all 1000 tiles, who owns each one, what color it is, and when it was last captured
- **Seeds 1000 tiles** — if the tiles table is empty (first time ever running), it automatically creates 1000 empty tiles numbered 0 to 999

**Important setting — WAL mode:** The file turns on something called WAL (Write-Ahead Logging). In simple terms: without this, every time someone claims a tile, the entire database freezes for a moment. With WAL on, reads and writes can happen at the same time without blocking each other. Essential for a multiplayer game.

---

### `server/package.json` — Server Dependencies List

**What it does:** Lists all the external libraries the server needs to work. When you run `npm install` in the server folder, npm reads this file and downloads everything listed.

**Libraries used:**

| Library | Why it's needed |
|---|---|
| `express` | Creates the web server and handles API routes like `/api/tiles` |
| `socket.io` | Handles real-time two-way communication with all browsers (WebSockets) |
| `better-sqlite3` | Lets Node.js read and write to the SQLite database file |
| `uuid` | Generates unique IDs for each new player (like `a3f2c1d4-...`) |
| `cors` | Allows the React frontend (on port 5173) to talk to the server (on port 3001) |

---

### `server/grid.db` — The Database File

**What it does:** This is the actual database — a single file that stores all game data. It is **automatically created** the first time you run `node index.js`. You never create or edit this manually.

**What's inside it:** All 1000 tiles and their owners, all registered players and their colors. If you delete this file and restart the server, the game resets completely — all tiles go back to unclaimed.

---

## 🌐 CLIENT FOLDER (`/client`)

This is everything the player sees in their browser. It's a React app that displays the grid, handles clicks, and listens for real-time updates.

---

### `client/vite.config.js` — Frontend Build Configuration

**What it does:** Configures Vite, the tool that runs the React development server. Has one critical job beyond basics — setting up a **proxy**.

**Why the proxy matters:** In development, React runs on port 5173 and your server runs on port 3001. Normally the browser would refuse to let them talk (security rule called CORS). The proxy tricks the browser by forwarding requests from 5173 to 3001 invisibly.

```
Browser thinks it's talking to: localhost:5173/api/tiles
Vite secretly forwards it to:   localhost:3001/api/tiles
```

The `/socket.io` proxy with `ws: true` does the same thing for WebSocket connections (real-time).

---

### `client/index.html` — The HTML Shell

**What it does:** A near-empty HTML file with just one `<div id="root">`. React injects the entire app into that div. You rarely touch this file.

---

### `client/src/index.css` — Global Styles

**What it does:** Sets global styles that apply to the whole app — background color, font, and base reset. This is where you change the background color of the entire page.

**The one line that matters most:**
```css
background: #0d1117;   ← change this to change the page background color
```

---

### `client/src/App.jsx` — The Root Component

**What it does:** The top-level component that holds everything together. Think of it as the frame of the app.

**Responsibilities:**

- Shows the **header** (title + connection status dot)
- Shows the **name entry modal** when a player first opens the site — the popup that asks for your name
- Lays out the **Grid** and **Leaderboard** side by side on screen
- Uses the `useSocket` hook and passes the socket, user info, and `claimTile` function down to the Grid

**If something is wrong with the overall layout** (centering, spacing, the modal not showing), this is the file to look at.

---

### `client/src/components/Grid.jsx` — The Game Board

**What it does:** Renders all 1000 tiles as a CSS grid, manages the tile state, and listens for real-time socket events. This is the most complex frontend file.

**Responsibilities:**

- **Fetches all tiles** from `/api/tiles` when the page first loads, so you see the current state of the board
- **Listens for `tile_update` events** from the server — when another player claims a tile, this updates that tile's color instantly without refreshing the page
- **Handles `claim_rejected`** — if two players click the same tile at the exact same moment, one gets rejected. The grid re-syncs that tile.
- **Shows the cooldown message** ("cooldown...") when a player clicks too fast
- **Shows online count** — how many players are connected right now
- **Renders 1000 `<Tile>` components** in a 40-column CSS grid

**If real-time updates aren't working**, this is the file to check — specifically the `socket.on('tile_update')` section.

---

### `client/src/components/Tile.jsx` — A Single Grid Cell

**What it does:** Represents one individual tile/cell on the board. There are 1000 of these rendered at once.

**What it handles:**

- Displays its background color (black if unclaimed, the owner's color if claimed)
- Shows a tooltip on hover: either "Unclaimed — click to capture!" or "Owned by [name]"
- Plays a **flash animation** when it gets newly claimed — it briefly scales up and brightens, giving a satisfying visual pop
- Has hover effects (brightens, scales up slightly) to feel interactive

**If tile animations or hover effects look wrong**, this is the file to fix.

---

### `client/src/components/Leaderboard.jsx` — The Score Panel

**What it does:** Shows the top 10 players ranked by how many tiles they own. Automatically refreshes every 5 seconds so scores stay current without needing a page reload.

**How it works:** Every 5 seconds it calls `/api/leaderboard` on the server, which runs a database query counting tiles per player and returns them sorted highest to lowest.

**If the leaderboard is blank**, either no one has claimed tiles yet, or the `/api/leaderboard` fetch is failing (check the server is running).

---

### `client/src/hooks/useSocket.js` — The Socket Connection Hook

**What it does:** A custom React hook that manages the WebSocket connection to the server. It's used in `App.jsx` and its results are passed down to other components.

**What it provides:**

| Export | What it is |
|---|---|
| `socket` | The raw socket object — used to listen for events in Grid.jsx |
| `connected` | `true` or `false` — is the server connection alive? |
| `user` | The current player's info (id, name, color) after registering |
| `register(name)` | Call this to send the player's name to the server and create their account |
| `claimTile(id, version)` | Call this when a player clicks a tile — sends the claim to the server |

**Why this is a hook instead of just code in App.jsx:** Keeps the socket logic in one place. If you ever need to change how you connect or add new socket events, you only touch this one file.

---

## 🔄 How Everything Connects (Simple Version)

```
Player opens site
    → App.jsx loads
    → useSocket.js connects to server via WebSocket
    → Grid.jsx fetches all 1000 tiles from /api/tiles
    → 1000 Tile.jsx components render on screen

Player types name and clicks Join
    → App.jsx calls register('name')
    → useSocket.js sends 'register' event to server
    → server/index.js saves user to grid.db
    → server sends back user's color
    → player is now in the game

Player clicks a tile
    → Tile.jsx fires onClick
    → Grid.jsx calls claimTile(tileId, version)
    → useSocket.js sends 'claim_tile' event to server
    → server/index.js checks cooldown + conflict
    → server writes new owner to grid.db
    → server sends 'tile_update' to ALL connected players
    → Every player's Grid.jsx receives the event
    → That tile's color updates on every screen instantly
```

---

## 🚀 How to Run the Project

**Terminal 1 — Start the server:**
```bash
cd grid-app/server
node index.js
```
You'll see: `Server running on http://localhost:3001`

**Terminal 2 — Start the frontend:**
```bash
cd grid-app/client
npm run dev
```
You'll see: `Local: http://localhost:5173`

Open `http://localhost:5173` in your browser to play.

---

## 🛠️ Common Questions

**Where is data stored?**
In `server/grid.db` — a single file on your computer. No external database needed.

**How do I reset the game (clear all tiles)?**
Delete `server/grid.db` and restart the server. It will recreate the file with 1000 empty tiles.

**How do I change the grid size?**
Change `COLS` and `ROWS` in `client/src/components/Grid.jsx`, and change the seed loop in `server/db.js` to match the new total.

**How do I change the background color?**
Open `client/src/index.css` and change the `background` value on the `body`.

**How do I change the cooldown time?**
Open `server/index.js` and find `< 400` — change 400 to however many milliseconds you want between clicks.

---

## 📦 Tech Stack Summary

| Tool | Role |
|---|---|
| **React** | UI framework — builds the interactive frontend |
| **Vite** | Development server and build tool for React |
| **Tailwind CSS** | Utility CSS classes for styling |
| **Node.js** | Runs the backend server |
| **Express** | Handles HTTP routes (API endpoints) |
| **Socket.io** | Real-time WebSocket communication between server and all browsers |
| **SQLite (better-sqlite3)** | Lightweight file-based database — no setup needed |
| **UUID** | Generates unique IDs for each player |


