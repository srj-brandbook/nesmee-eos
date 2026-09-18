"use client";

import { useEffect, useState } from "react";

export function useDebouncedSearch(initial = "", delay = 300) {
  const [value, setValue] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return { value, setValue, debounced };
}
