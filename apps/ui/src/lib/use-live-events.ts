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
 */
export function useLiveEvents() {
  const ds = useDataSource();
  const queryClient = useQueryClient();

  useEffect(() => {
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      timer = undefined;
      pending.forEach((key) => {
        void queryClient.invalidateQueries({ queryKey: [key] });
      });
      pending.clear();
    };

    const unsubscribe = ds.streamEvents((event) => {
      const keys = AFFECTED_KEYS[event.kind];
      if (!keys) return;
      keys.forEach((key) => pending.add(key));
      if (timer === undefined) {
        flush();
        timer = setTimeout(flush, THROTTLE_MS);
      }
    });

    return () => {
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [ds, queryClient]);
}
