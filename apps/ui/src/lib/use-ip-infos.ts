import { useQuery } from "@tanstack/react-query";
import { type IpInfo, useDataSource } from "@/lib/datasource";

/**
 * Country info for a set of IPs, batched into one request. Geo data for an IP
 * never changes within a session, so results are cached aggressively.
 */
export function useIpInfos(ips: string[]): Record<string, IpInfo> {
  const ds = useDataSource();
  const unique = Array.from(new Set(ips)).sort();
  const { data = {} } = useQuery({
    queryKey: ["ip-infos", unique.join(",")],
    queryFn: () => ds.getIpInfos(unique),
    enabled: unique.length > 0,
    staleTime: 60 * 60 * 1000,
  });
  return data;
}
