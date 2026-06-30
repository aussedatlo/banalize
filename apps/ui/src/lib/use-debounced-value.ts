import { useEffect, useState } from "react";

/**
 * Returns a copy of `value` that only updates after it has stopped changing
 * for `delayMs`. Handy for deferring expensive work (e.g. a backend
 * validation request) until the user pauses typing.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
