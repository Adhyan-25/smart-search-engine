import { useEffect, useState } from 'react';

/** Debounces a fast-changing value (e.g. keystroke-by-keystroke search text). */
export function useDebounce(value, delayMs = 275) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
