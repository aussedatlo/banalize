import { useDataSource } from "@/lib/datasource";
import { useQuery } from "@tanstack/react-query";

/** Health of the backend connection, driving the status dot. */
export type HealthState = "online" | "offline" | "pending";

/**
 * The core version (fetched once) plus a live health signal (polled). The
 * version never changes for the process lifetime, so it's cached forever; the
 * health probe re-runs on an interval and its query state drives the dot.
 */
export function useStatus(): { coreVersion?: string; health: HealthState } {
  const ds = useDataSource();

  const { data } = useQuery({
    queryKey: ["version"],
    queryFn: () => ds.getVersion(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const { status } = useQuery({
    queryKey: ["health"],
    queryFn: () => ds.getHealth(),
    refetchInterval: 30_000,
    retry: false,
  });

  const health: HealthState =
    status === "success"
      ? "online"
      : status === "error"
        ? "offline"
        : "pending";

  return { coreVersion: data?.version, health };
}
