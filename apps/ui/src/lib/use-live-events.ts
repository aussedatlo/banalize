import { useDataSource, type LiveEventKind } from "@/lib/datasource";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/** Root query keys to refresh per event kind (prefix-matched by React Query). */
const AFFECTED_KEYS: Record<LiveEventKind, string[]> = {
  match: ["matches", "ip-stats"],
  ban: ["bans", "ip-stats"],
  unban: ["unbans", "bans", "ip-stats"],
};

const THROTTLE_MS = 1_000;

/**
 * Subscribes once to the core's live event stream and invalidates the
 * affected queries so every page refreshes without polling. Invalidations
 * are throttled (leading + trailing) because an attack burst can emit
 * hundreds of match events per second.
 *
 * Both edges fire every window: the leading edge keeps live updates snappy,
 * and the trailing edge re-fetches once more ~THROTTLE_MS later. The trailing
 * refetch is essential, not just coalescing — a match's SSE event is emitted
 * before its durable audit-log write lands, so the leading refetch alone can
 * read stale (empty) data and, with no further events, never correct itself.
 */
export function useLiveEvents() {
  const ds = useDataSource();
  const queryClient = useQueryClient();

  useEffect(() => {
    let keys = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const invalidate = () => {
      keys.forEach((key) => {
        void queryClient.invalidateQueries({ queryKey: [key] });
      });
    };

    const unsubscribe = ds.streamEvents((event) => {
      const affected = AFFECTED_KEYS[event.kind];
      if (!affected) return;
      affected.forEach((key) => keys.add(key));
      if (timer !== undefined) return;

      invalidate(); // leading edge
      timer = setTimeout(() => {
        timer = undefined;
        invalidate(); // trailing edge
        keys = new Set();
      }, THROTTLE_MS);
    });

    return () => {
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [ds, queryClient]);
}
