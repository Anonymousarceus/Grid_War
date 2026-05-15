import { useEffect, useState } from 'react';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const fetch_ = () =>
      fetch('/api/leaderboard')
        .then(r => r.json())
        .then(setLeaders)
        .catch(() => {});

    fetch_();
    const interval = setInterval(fetch_, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (leaders.length === 0) return null;

  return (
    <div className="bg-white/5 rounded-xl p-4 min-w-45">
      <h2 className="text-white/60 text-xs uppercase tracking-wider mb-3">Leaderboard</h2>
      <ol className="space-y-2">
        {leaders.map((u, i) => (
          <li key={u.id} className="flex items-center gap-2 text-sm">
            <span className="text-white/30 w-4 text-right">{i + 1}</span>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: u.color }} />
            <span className="text-white/80 truncate flex-1">{u.name}</span>
            <span className="text-white/40 text-xs">{u.tiles}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}