import { useState } from 'react';
import Grid from './components/Grid';
import Leaderboard from './components/Leaderboard';
import { useSocket } from './hooks/useSocket';

export default function App() {
  const { socket, connected, user, register, claimTile } = useSocket();
  const [nameInput, setNameInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    register(nameInput.trim());
    setSubmitted(true);
  };

  return (
  <div className="min-h-screen p-4 flex flex-col items-center">
    {/* Header */}
    <header className="flex items-center justify-between mb-6 w-full max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Grid Wars</h1>
        <p className="text-white/40 text-sm">Click tiles to capture them</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-white/40">{connected ? 'connected' : 'connecting...'}</span>
      </div>
    </header>

    {/* Name entry modal */}
    {!user && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <form
          onSubmit={handleJoin}
          className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 flex flex-col gap-4 w-80"
        >
          <h2 className="text-white text-lg font-medium">Enter your name</h2>
          <p className="text-white/40 text-sm">Join the board and start capturing tiles</p>
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            maxLength={20}
            placeholder="Your name..."
            autoFocus
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors"
          />
          <button
            type="submit"
            disabled={!nameInput.trim() || !connected}
            className="bg-white text-black font-medium py-3 rounded-lg disabled:opacity-30 hover:bg-white/90 transition-colors"
          >
            Join game
          </button>
        </form>
      </div>
    )}

    {/* Main content */}
    <div className="flex gap-6 w-full max-w-5xl items-start justify-center">
      <div className="flex-1 min-w-0">
        <Grid socket={socket} user={user} claimTile={claimTile} />
      </div>
      <div className="shrink-0">
        <Leaderboard />
      </div>
    </div>
  </div>
);
}