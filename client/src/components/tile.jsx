import { useState, useEffect } from 'react';

export default function Tile({ id, data, onClick }) {
  const [flash, setFlash] = useState(false);

  // Trigger pop animation whenever owner changes
  useEffect(() => {
    if (data?.color) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 350);
      return () => clearTimeout(t);
    }
  }, [data?.ownerId]);

  const bg = data?.color || '#1a1a1a';
  const title = data?.ownerName ? `Owned by ${data.ownerName}` : 'Unclaimed — click to capture!';

  return (
    <div
      onClick={onClick}
      title={title}
      style={{ backgroundColor: bg }}
      className={`
        w-full aspect-square cursor-pointer border border-white/5
        transition-all duration-150 ease-out
        hover:brightness-125 hover:scale-110 hover:z-10 hover:border-white/30
        ${flash ? 'scale-125 brightness-150 z-20' : ''}
        ${!data?.color ? 'hover:bg-white/10' : ''}
      `}
    />
  );
}