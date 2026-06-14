import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type LogEntry, type LogLevel, useDataSource } from "@/lib/datasource";
import { cn } from "@/lib/utils";
import { Eraser, Pause, Play, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"];

const levelClass: Record<LogLevel, string> = {
  ERROR: "text-red-600 dark:text-red-400",
  WARN: "text-amber-600 dark:text-amber-400",
  INFO: "text-sky-600 dark:text-sky-400",
  DEBUG: "text-muted-foreground",
  TRACE: "text-muted-foreground",
};

export default function LogsPage() {
  const ds = useDataSource();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LogLevel | "ALL">("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ds.getLogs()
      .then(setLogs)
      .catch(() => {});
  }, [ds]);

  useEffect(() => {
    return ds.streamLogs((entry) => {
      setLogs((prev) => [...prev.slice(-999), entry]);
    });
  }, [ds]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

  const query = search.trim().toLowerCase();
  const visible = logs.filter(
    (l) =>
      (filter === "ALL" || l.level === filter) &&
      (query === "" ||
        l.message.toLowerCase().includes(query) ||
        l.target.toLowerCase().includes(query)),
  );

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Logs</h2>
        <p className="text-muted-foreground">Live core application logs</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            className="pl-8"
            data-testid="logs-search"
            placeholder="Search message or target…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as LogLevel | "ALL")}
        >
          <SelectTrigger className="w-36" aria-label="Filter by level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All levels</SelectItem>
            {LEVELS.map((lvl) => (
              <SelectItem key={lvl} value={lvl}>
                <span
                  className={cn("font-mono font-semibold", levelClass[lvl])}
                >
                  {lvl}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          data-testid="logs-pause-toggle"
          aria-pressed={autoScroll}
          onClick={() => setAutoScroll((v) => !v)}
        >
          {autoScroll ? (
            <Pause className="mr-1 h-3 w-3" />
          ) : (
            <Play className="mr-1 h-3 w-3" />
          )}
          {autoScroll ? "Pause scroll" : "Follow"}
        </Button>
        <Button
          variant="outline"
          data-testid="logs-clear"
          onClick={() => setLogs([])}
        >
          <Eraser className="mr-1 h-3 w-3" />
          Clear
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-card p-2 font-mono text-xs">
        {visible.length === 0 ? (
          <p className="py-8 text-center font-sans text-sm text-muted-foreground">
            {logs.length === 0
              ? "No log entries yet…"
              : "No entries for the current filters"}
          </p>
        ) : (
          visible.map((entry, i) => (
            <div
              key={i}
              data-testid="logs-line"
              className="flex gap-3 rounded px-1 py-px leading-5 hover:bg-muted/50"
            >
              <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={cn(
                  "w-12 shrink-0 font-semibold",
                  levelClass[entry.level],
                )}
              >
                {entry.level}
              </span>
              <span className="w-44 shrink-0 truncate text-muted-foreground">
                {entry.target}
              </span>
              <span className="break-all">{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {visible.length === logs.length
          ? `${logs.length} entries`
          : `${visible.length} of ${logs.length} entries`}
      </p>
    </div>
  );
}
