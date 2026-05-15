import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    socketRef.current = io(); // Vite proxy handles the URL

    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));
    socketRef.current.on('registered', (data) => setUser(data));

    return () => socketRef.current?.disconnect();
  }, []);

  const register = (name) => {
    socketRef.current?.emit('register', { name });
  };

  const claimTile = (tileId, version) => {
    socketRef.current?.emit('claim_tile', { tileId, version });
  };

  return { socket: socketRef.current, connected, user, register, claimTile };
}