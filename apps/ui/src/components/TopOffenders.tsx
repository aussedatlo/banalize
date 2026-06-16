import IpFlag from "@/components/ip-flag";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataSource } from "@/lib/datasource";
import { useIpInfos } from "@/lib/use-ip-infos";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const MAX_ROWS = 6;

/** Compact leaderboard of the heaviest offending IPs (matches + bans). Mirrors
 * the Offenders page ranking; click a row to see that IP's matches. */
export default function TopOffenders({
  configId,
  className,
}: {
  configId?: string;
  className?: string;
}) {
  const ds = useDataSource();
  const navigate = useNavigate();
  const scope = configId ?? "all";

  const { data: stats = [] } = useQuery({
    queryKey: ["ip-stats", scope, "dashboard"],
    queryFn: () => ds.getIpStats(configId),
    refetchInterval: 60_000,
  });

  const rows = [...stats]
    .sort((a, b) => b.match_count + b.ban_count - (a.match_count + a.ban_count))
    .slice(0, MAX_ROWS);
  const ipInfos = useIpInfos(rows.map((s) => s.ip));

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top offenders</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {rows.length === 0 ? (
          <p
            data-testid="top-offenders-empty"
            className="py-12 text-center text-sm text-muted-foreground"
          >
            No activity recorded
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((s) => (
              <li
                key={s.ip}
                data-testid={`top-offenders-${s.ip}`}
                className="flex cursor-pointer items-center gap-3 rounded px-1 py-0.5 hover:bg-muted/50"
                onClick={() =>
                  navigate(`/events?q=${encodeURIComponent(s.ip)}`)
                }
              >
                <IpFlag info={ipInfos[s.ip]} />
                <span className="flex-1 truncate font-mono text-sm">
                  {s.ip}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {s.match_count} matches
                </span>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {s.ban_count} bans
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
