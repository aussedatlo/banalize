import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type IpStats, useDataSource } from "@/lib/datasource";
import { isIpBanned } from "@/lib/ban-status";
import { type Period, periodStart } from "@/lib/period";
import { useNow } from "@/lib/use-now";
import { formatTimestamp } from "@/lib/utils";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { useIpInfos } from "@/lib/use-ip-infos";
import EventTableToolbar from "@/components/event-table-toolbar";
import IpFlag from "@/components/ip-flag";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 50;

type SortKey = "events" | "match_count" | "ban_count" | "last_seen";

function sortValue(s: IpStats, key: SortKey): number {
  if (key === "events") return s.match_count + s.ban_count;
  return s[key];
}

export default function OffendersPage() {
  const ds = useDataSource();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [configFilter, setConfigFilter] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [sortKey, setSortKey] = useState<SortKey>("events");
  const [sortAsc, setSortAsc] = useState(false);

  // `since` is computed inside queryFn so the 15s refetch keeps the window
  // sliding instead of freezing it at mount time.
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["ip-stats", configFilter, period],
    queryFn: () =>
      ds.getIpStats(
        configFilter === "all" ? undefined : configFilter,
        periodStart(period),
      ),
    refetchInterval: 60_000,
  });
  const { data: configs = [] } = useQuery({
    queryKey: ["configs"],
    queryFn: () => ds.getConfigs(),
  });
  // Light tables, only needed to derive the live "banned" status.
  const { data: bans = [] } = useQuery({
    queryKey: ["bans", "all"],
    queryFn: () => ds.getBans(),
    refetchInterval: 60_000,
  });
  const { data: unbans = [] } = useQuery({
    queryKey: ["unbans", "all"],
    queryFn: () => ds.getUnbans(),
    refetchInterval: 60_000,
  });

  const now = useNow(1000);
  const configMap = new Map(configs.map((c) => [c.id, c]));

  const query = search.trim().toLowerCase();
  const filtered = stats
    .filter((s) => query === "" || s.ip.toLowerCase().includes(query))
    .sort((a, b) => {
      const diff = sortValue(b, sortKey) - sortValue(a, sortKey);
      return sortAsc ? -diff : diff;
    });

  const { count, sentinelRef } = useInfiniteScroll(
    PAGE_SIZE,
    `${query}|${configFilter}|${period}|${sortKey}|${sortAsc}`,
  );
  const visible = filtered.slice(0, count);
  const ipInfos = useIpInfos(visible.map((s) => s.ip));

  const sortableHead = (key: SortKey, label: string) => (
    <TableHead>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => {
          if (sortKey === key) {
            setSortAsc((v) => !v);
          } else {
            setSortKey(key);
            setSortAsc(false);
          }
        }}
      >
        {label}
        {sortKey === key ? (
          sortAsc ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Offenders</h2>
        <p className="text-muted-foreground">
          Unique IPs ranked by recorded activity — click one to see its matches
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
              {sortableHead("match_count", "Matches")}
              {sortableHead("ban_count", "Bans")}
              <TableHead>Configs</TableHead>
              {sortableHead("last_seen", "Last seen")}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {stats.length === 0
                    ? "No activity recorded"
                    : "No IPs for the current filters"}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((s) => {
                const banned = isIpBanned(s.ip, bans, unbans, configMap, now);
                return (
                  <TableRow
                    key={s.ip}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(`/matches?q=${encodeURIComponent(s.ip)}`)
                    }
                  >
                    <TableCell className="whitespace-nowrap font-mono text-sm">
                      <IpFlag info={ipInfos[s.ip]} /> {s.ip}
                    </TableCell>
                    <TableCell className="tabular-nums">{s.match_count}</TableCell>
                    <TableCell className="tabular-nums">{s.ban_count}</TableCell>
                    <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                      {s.config_ids.join(", ")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimestamp(s.last_seen)}
                    </TableCell>
                    <TableCell>
                      {banned ? (
                        <Badge variant="destructive" className="font-normal">
                          banned
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {count < filtered.length ? (
        <div ref={sentinelRef} className="py-2 text-center text-xs text-muted-foreground">
          Loading more…
        </div>
      ) : filtered.length > PAGE_SIZE ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          {filtered.length} IPs
        </p>
      ) : null}
    </div>
  );
}
