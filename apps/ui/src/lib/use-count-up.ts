import { useEffect, useRef, useState } from "react";

/** Ease-out cubic: fast start, gentle landing on the final value. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates from 0 up to `target`, returning the current rounded value. Each
 * time `target` changes the count restarts from the previous value, so cards
 * tick up smoothly when their data first loads (or later updates).
 */
export function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const current = from + (target - from) * easeOutCubic(t);
      setValue(current);
      fromRef.current = current;
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setValue(target);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return Math.round(value);
}
