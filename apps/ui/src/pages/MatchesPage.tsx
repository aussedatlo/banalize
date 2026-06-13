import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useDataSource } from "@/lib/datasource";
import { type Period, periodStart } from "@/lib/period";
import { formatTimestamp } from "@/lib/utils";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import { useIpInfos } from "@/lib/use-ip-infos";
import EventTableToolbar from "@/components/event-table-toolbar";
import HighlightedLine from "@/components/highlighted-line";
import IpFlag from "@/components/ip-flag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 50;

export default function MatchesPage() {
  const ds = useDataSource();
  // ?q= pre-fills the search, e.g. when clicking an IP on the Offenders page.
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [configId, setConfigId] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpandedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: () => ds.getMatches(),
  });
  const { data: configs = [] } = useQuery({
    queryKey: ["configs"],
    queryFn: () => ds.getConfigs(),
  });

  const query = search.trim().toLowerCase();
  const since = periodStart(period);
  const filtered = matches
    .filter(
      (m) =>
        (configId === "all" || m.config_id === configId) &&
        (since === undefined || m.timestamp >= since) &&
        (query === "" ||
          m.ip.toLowerCase().includes(query) ||
          m.line.toLowerCase().includes(query)),
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  const configMap = new Map(configs.map((c) => [c.id, c]));

  const { count, sentinelRef } = useInfiniteScroll(
    PAGE_SIZE,
    `${query}|${configId}|${period}`,
  );
  const visible = filtered.slice(0, count);
  const ipInfos = useIpInfos(visible.map((m) => m.ip));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Matches</h2>
        <p className="text-muted-foreground">
          Log lines that matched a config regex
        </p>
      </div>

      <EventTableToolbar
        search={search}
        onSearchChange={setSearch}
        configId={configId}
        onConfigIdChange={setConfigId}
        configs={configs}
        period={period}
        onPeriodChange={setPeriod}
        searchPlaceholder="Search by IP or line…"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP</TableHead>
              <TableHead>Config</TableHead>
              <TableHead>Matched at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {matches.length === 0
                    ? "No matches recorded"
                    : "No matches for the current filters"}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((m) => (
                <Fragment key={m.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => toggleExpanded(m.id)}
                  >
                    <TableCell className="whitespace-nowrap font-mono text-sm">
                      <IpFlag info={ipInfos[m.ip]} /> {m.ip}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.config_id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimestamp(m.timestamp)}
                    </TableCell>
                  </TableRow>
                  {expandedIds.has(m.id) ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="bg-muted/50">
                        {m.line ? (
                          <HighlightedLine
                            line={m.line}
                            regex={configMap.get(m.config_id)?.regex}
                            ip={m.ip}
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
              ))
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
          {filtered.length} matches
        </p>
      ) : null}
    </div>
  );
}
