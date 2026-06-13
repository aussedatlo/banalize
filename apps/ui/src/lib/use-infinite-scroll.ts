import { useEffect, useRef, useState } from "react";

/**
 * Incremental rendering for long client-side lists: exposes how many rows to
 * render and a sentinel ref; each time the sentinel scrolls into view another
 * page of rows is revealed. `resetKey` (e.g. the active filters) snaps the
 * window back to the first page when it changes.
 */
export function useInfiniteScroll(pageSize: number, resetKey: unknown) {
  const [count, setCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCount(pageSize);
  }, [pageSize, resetKey]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => c + pageSize);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageSize]);

  return { count, sentinelRef };
}
