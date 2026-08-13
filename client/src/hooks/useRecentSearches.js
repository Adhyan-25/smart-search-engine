import { useEffect, useState } from 'react';

const STORAGE_KEY = 'smart-search-recent';
const MAX_RECENT = 6;

export function useRecentSearches() {
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  }, [recent]);

  const addRecent = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const withoutDup = prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...withoutDup].slice(0, MAX_RECENT);
    });
  };

  const clearRecent = () => setRecent([]);

  return { recent, addRecent, clearRecent };
}
