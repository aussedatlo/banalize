import EventTableToolbar from "@/components/event-table-toolbar";
import IpFlag from "@/components/ip-flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type BanStatus, banStatus } from "@/lib/ban-status";
import { useDataSource } from "@/lib/datasource";
import { type Period, periodStart } from "@/lib/period";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { useIpInfos } from "@/lib/use-ip-infos";
import { useNow } from "@/lib/use-now";
import { formatDuration, formatTimestamp } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldOff } from "lucide-react";
import { useState } from "react";

const statusBadge: Record<
  BanStatus,
  { variant: "destructive" | "secondary" | "outline"; label: string }
> = {
  active: { variant: "destructive", label: "active" },
  expired: { variant: "outline", label: "expired" },
  unbanned: { variant: "secondary", label: "unbanned" },
};

const PAGE_SIZE = 50;

export default function BansPage() {
  const ds = useDataSource();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [configFilter, setConfigFilter] = useState("all");
  const [period, setPeriod] = useState<Period>("all");

  // Live SSE events drive refreshes; this slow poll bounds staleness if one is missed.
  const { data: bans = [], isLoading } = useQuery({
    queryKey: ["bans", "all"],
    queryFn: () => ds.getBans(),
    refetchInterval: 60_000,
  });
  const { data: unbans = [] } = useQuery({
    queryKey: ["unbans", "all"],
    queryFn: () => ds.getUnbans(),
    refetchInterval: 60_000,
  });
  const { data: configs = [] } = useQuery({
    queryKey: ["configs"],
    queryFn: () => ds.getConfigs(),
  });

  const { mutate: unban, variables: unbanning } = useMutation({
    mutationFn: (id: string) => ds.disableBan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bans"] });
      queryClient.invalidateQueries({ queryKey: ["unbans"] });
    },
  });

  const now = useNow(1000);
  const configMap = new Map(configs.map((c) => [c.id, c]));

  const query = search.trim().toLowerCase();
  const since = periodStart(period, now);
  const filtered = bans
    .filter(
      (b) =>
        (configFilter === "all" || b.config_id === configFilter) &&
        (since === undefined || b.timestamp >= since) &&
        (query === "" || b.ip.toLowerCase().includes(query)),
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  const { count, sentinelRef } = useInfiniteScroll(
    PAGE_SIZE,
    `${query}|${configFilter}|${period}`,
  );
  const visible = filtered.slice(0, count);
  const ipInfos = useIpInfos(visible.map((b) => b.ip));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Bans</h2>
        <p className="text-muted-foreground">
          All ban events — active bans can be lifted with Unban
        </p>
      </div>

      <EventTableToolbar
        search={search}
        onSearchChange={setSearch}
        configId={configFilter}
        onConfigIdChange={setConfigFilter}
        configs={configs}
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP</TableHead>
              <TableHead>Config</TableHead>
              <TableHead>Banned at</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  data-testid="bans-empty"
                  className="text-center text-muted-foreground"
                >
                  {bans.length === 0
                    ? "No bans recorded"
                    : "No bans for the current filters"}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((ban) => {
                const status = banStatus(ban, unbans, configMap, now);
                const active = status === "active";
                const scheduledEnd = configMap.get(ban.config_id)
                  ? ban.timestamp + configMap.get(ban.config_id)!.ban_time
                  : undefined;
                return (
                  <TableRow
                    key={ban.id}
                    data-testid={`bans-row-${ban.ip}`}
                    className={active ? undefined : "text-muted-foreground"}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <IpFlag info={ipInfos[ban.ip]} />
                        <Badge
                          variant={active ? "destructive" : "secondary"}
                          className="font-mono font-normal"
                        >
                          {ban.ip}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ban.config_id}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(ban.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={statusBadge[status].variant}
                          className="font-normal"
                          data-testid={`bans-status-${ban.ip}`}
                        >
                          {statusBadge[status].label}
                        </Badge>
                        {active && scheduledEnd !== undefined ? (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatDuration(Math.max(0, scheduledEnd - now))}{" "}
                            left
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`bans-unban-${ban.ip}`}
                          disabled={unbanning === ban.id}
                          onClick={() => unban(ban.id)}
                        >
                          <ShieldOff className="mr-1 h-3 w-3" />
                          {unbanning === ban.id ? "Unbanning…" : "Unban"}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {count < filtered.length ? (
        <div
          ref={sentinelRef}
          className="py-2 text-center text-xs text-muted-foreground"
        >
          Loading more…
        </div>
      ) : filtered.length > PAGE_SIZE ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          {filtered.length} bans
        </p>
      ) : null}
    </div>
  );
}
