import EventTableToolbar from "@/components/event-table-toolbar";
import HighlightedLine from "@/components/highlighted-line";
import IpFlag from "@/components/ip-flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type BanStatus, banStatus, effectiveBanTime } from "@/lib/ban-status";
import { useDataSource } from "@/lib/datasource";
import { type Period, periodStart } from "@/lib/period";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { useIpInfos } from "@/lib/use-ip-infos";
import { useNow } from "@/lib/use-now";
import { cn, formatDuration, formatTimestamp } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Shield, ShieldOff } from "lucide-react";
import { Fragment, useState } from "react";

const PAGE_SIZE = 50;

type EventKind = "match" | "ban" | "unban";
type TypeFilter = "all" | EventKind;

/**
 * Chronological recency of each kind, used only to break timestamp ties. A ban
 * is issued after the matches that trigger it (and an unban after the ban), but
 * the millisecond clock can collapse a ban onto the same tick as its triggering
 * match. Sorting equal timestamps by this rank keeps a ban from interleaving
 * with its own matches — newest kind first, matching the reverse-chronological
 * order of the table.
 */
const kindRecency: Record<EventKind, number> = { match: 0, ban: 1, unban: 2 };

/** One row in the merged timeline, derived from a match, ban or unban event. */
interface EventRow {
  kind: EventKind;
  id: string;
  ip: string;
  config_id: string;
  timestamp: number;
  /** Present only on match rows (the raw log line). */
  line?: string;
}

const kindMeta: Record<
  EventKind,
  {
    label: string;
    icon: React.ElementType;
    className: string;
    testIdBase: string;
  }
> = {
  match: {
    label: "match",
    icon: Activity,
    className: "text-brand-blue",
    testIdBase: "matches",
  },
  ban: {
    label: "ban",
    icon: Shield,
    className: "text-destructive",
    testIdBase: "bans",
  },
  unban: {
    label: "unban",
    icon: ShieldOff,
    className: "text-muted-foreground",
    testIdBase: "unbans",
  },
};

const statusBadge: Record<
  BanStatus,
  { variant: "destructive" | "secondary" | "outline"; label: string }
> = {
  active: { variant: "destructive", label: "active" },
  expired: { variant: "outline", label: "expired" },
  unbanned: { variant: "secondary", label: "unbanned" },
};

interface EventsTableProps {
  /** When set, the table is scoped to a single config (config filter hidden). */
  configId?: string;
  /** Initial search value, e.g. an IP passed via `?q=`. */
  initialSearch?: string;
}

/**
 * Merged, reverse-chronological timeline of match, ban and unban events.
 * Reused by the global Events page (unscoped) and the config detail page
 * (`configId` scoped). Ban rows keep their live status + Unban action and match
 * rows expand to show the matched log line.
 */
export default function EventsTable({
  configId,
  initialSearch = "",
}: EventsTableProps) {
  const ds = useDataSource();
  const queryClient = useQueryClient();
  const scope = configId ?? "all";

  const [search, setSearch] = useState(initialSearch);
  const [configFilter, setConfigFilter] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpandedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["matches", scope],
    queryFn: () => ds.getMatches(configId),
  });
  // Live SSE events drive refreshes; this slow poll bounds staleness if one is missed.
  const { data: bans = [], isLoading: bansLoading } = useQuery({
    queryKey: ["bans", scope],
    queryFn: () => ds.getBans(configId),
    refetchInterval: 60_000,
  });
  const { data: unbans = [], isLoading: unbansLoading } = useQuery({
    queryKey: ["unbans", scope],
    queryFn: () => ds.getUnbans(configId),
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
  const isLoading = matchesLoading || bansLoading || unbansLoading;
  const configMap = new Map(configs.map((c) => [c.id, c]));

  const rows: EventRow[] = [
    ...matches.map((m) => ({
      kind: "match" as const,
      id: m.id,
      ip: m.ip,
      config_id: m.config_id,
      timestamp: m.timestamp,
      line: m.line,
    })),
    ...bans.map((b) => ({
      kind: "ban" as const,
      id: b.id,
      ip: b.ip,
      config_id: b.config_id,
      timestamp: b.timestamp,
    })),
    ...unbans.map((u) => ({
      kind: "unban" as const,
      id: u.id,
      ip: u.ip,
      config_id: u.config_id,
      timestamp: u.timestamp,
    })),
  ];

  const query = search.trim().toLowerCase();
  const since = periodStart(period, now);
  const filtered = rows
    .filter(
      (r) =>
        (typeFilter === "all" || r.kind === typeFilter) &&
        (configFilter === "all" || r.config_id === configFilter) &&
        (since === undefined || r.timestamp >= since) &&
        (query === "" ||
          r.ip.toLowerCase().includes(query) ||
          (r.line?.toLowerCase().includes(query) ?? false)),
    )
    .sort(
      (a, b) =>
        b.timestamp - a.timestamp || kindRecency[b.kind] - kindRecency[a.kind],
    );

  const { count, sentinelRef } = useInfiniteScroll(
    PAGE_SIZE,
    `${query}|${configFilter}|${period}|${typeFilter}|${scope}`,
  );
  const visible = filtered.slice(0, count);
  const ipInfos = useIpInfos(visible.map((r) => r.ip));

  const rowKey = (r: EventRow) => `${r.kind}-${r.id}`;

  return (
    <div className="space-y-4">
      <EventTableToolbar
        search={search}
        onSearchChange={setSearch}
        configId={configFilter}
        onConfigIdChange={setConfigFilter}
        configs={configs}
        period={period}
        onPeriodChange={setPeriod}
        searchPlaceholder="Search by IP or line…"
        hideConfig={configId !== undefined}
      >
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-full sm:w-36" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="match">Matches</SelectItem>
            <SelectItem value="ban">Bans</SelectItem>
            <SelectItem value="unban">Unbans</SelectItem>
          </SelectContent>
        </Select>
      </EventTableToolbar>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Config</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  data-testid="events-empty"
                  className="text-center text-muted-foreground"
                >
                  {rows.length === 0
                    ? "No events recorded"
                    : "No events for the current filters"}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => {
                const meta = kindMeta[r.kind];
                const Icon = meta.icon;
                const expandable = r.kind === "match";
                const expanded = expandedIds.has(rowKey(r));

                const ban =
                  r.kind === "ban"
                    ? bans.find((b) => b.id === r.id)
                    : undefined;
                const status = ban
                  ? banStatus(ban, bans, unbans, configMap, now)
                  : undefined;
                const active = status === "active";
                const banConfig = ban
                  ? configMap.get(ban.config_id)
                  : undefined;
                const scheduledEnd =
                  ban && banConfig
                    ? ban.timestamp + effectiveBanTime(ban, bans, banConfig)
                    : undefined;

                return (
                  <Fragment key={rowKey(r)}>
                    <TableRow
                      data-testid={`${meta.testIdBase}-row-${r.ip}`}
                      className={cn(
                        expandable && "cursor-pointer",
                        r.kind === "ban" && !active && "text-muted-foreground",
                      )}
                      onClick={
                        expandable ? () => toggleExpanded(rowKey(r)) : undefined
                      }
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Icon className={cn("h-3.5 w-3.5", meta.className)} />
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-sm">
                        <IpFlag info={ipInfos[r.ip]} /> {r.ip}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.config_id}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatTimestamp(r.timestamp)}
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={statusBadge[status].variant}
                              className="font-normal"
                              data-testid={`bans-status-${r.ip}`}
                            >
                              {statusBadge[status].label}
                            </Badge>
                            {active && scheduledEnd !== undefined ? (
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {formatDuration(
                                  Math.max(0, scheduledEnd - now),
                                )}{" "}
                                left
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {ban && active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`bans-unban-${r.ip}`}
                            disabled={unbanning === ban.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              unban(ban.id);
                            }}
                          >
                            <ShieldOff className="mr-1 h-3 w-3" />
                            {unbanning === ban.id ? "Unbanning…" : "Unban"}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {expandable && expanded ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="bg-muted/50">
                          {r.line ? (
                            <HighlightedLine
                              line={r.line}
                              regex={configMap.get(r.config_id)?.regex}
                              ip={r.ip}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No line recorded for this match (event predates
                              line capture).
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
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
          {filtered.length} events
        </p>
      ) : null}
    </div>
  );
}
