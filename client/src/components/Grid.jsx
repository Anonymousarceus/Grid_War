import { useEffect, useState } from 'react';
import Tile from './Tile';

const COLS = 40;
const ROWS = 25;
const TOTAL = COLS * ROWS; // 1000

export default function Grid({ socket, user, claimTile }) {
  const [tiles, setTiles] = useState({});
  const [onlineCount, setOnlineCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);

  // Load initial grid state from server
  useEffect(() => {
    fetch('/api/tiles')
      .then(r => r.json())
      .then(rows => {
        const map = {};
        rows.forEach(t => { map[t.id] = t; });
        setTiles(map);
      });
  }, []);

  // Listen for real-time events
  useEffect(() => {
    if (!socket) return;

    // A tile was claimed by someone
    socket.on('tile_update', (update) => {
      setTiles(prev => ({
        ...prev,
        [update.tileId]: {
          id: update.tileId,
          color: update.color,
          ownerName: update.ownerName,
          ownerId: update.ownerId,
          version: update.version,
        }
      }));
    });

    // Conflict: our claim was rejected (race condition)
    socket.on('claim_rejected', ({ tileId }) => {
      // Re-fetch just that tile to sync
      fetch('/api/tiles')
        .then(r => r.json())
        .then(rows => {
          const tile = rows.find(t => t.id === tileId);
          if (tile) setTiles(prev => ({ ...prev, [tileId]: tile }));
        });
    });

    // Cooldown notice
    socket.on('cooldown', () => {
      setCooldown(true);
      setTimeout(() => setCooldown(false), 400);
    });

    socket.on('online_count', setOnlineCount);

    return () => {
      socket.off('tile_update');
      socket.off('claim_rejected');
      socket.off('cooldown');
      socket.off('online_count');
    };
  }, [socket]);

  const handleTileClick = (id) => {
    if (!user || cooldown) return;
    const currentVersion = tiles[id]?.version ?? 0;
    claimTile(id, currentVersion);
  };

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center gap-4 mb-3 text-sm text-white/50">
        <span>
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${onlineCount > 1 ? 'bg-green-400' : 'bg-yellow-400'}`} />
          {onlineCount} online
        </span>
        {cooldown && (
          <span className="text-yellow-400 text-xs animate-pulse">cooldown...</span>
        )}
        {user && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: user.color }} />
            playing as <strong>{user.name}</strong>
          </span>
        )}
      </div>

      {/* The grid */}
      <div
        className="w-full border border-white/10 rounded-lg overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: '1px',
          background: '#111',
        }}
      >
        {Array.from({ length: TOTAL }, (_, i) => (
          <Tile
            key={i}
            id={i}
            data={tiles[i]}
            onClick={() => handleTileClick(i)}
          />
        ))}
      </div>

      <p className="text-center text-white/20 text-xs mt-2">
        {COLS}×{ROWS} grid · {TOTAL} tiles
      </p>
    </div>
  );
}