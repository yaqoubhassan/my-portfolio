import { useState, useEffect } from 'react';

export function useScrollspy(ids: string[], offset = 100) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset) {
            setActiveId(ids[i]);
            return;
          }
        }
      }
      setActiveId(ids[0]);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ids, offset]);

  return activeId;
}
