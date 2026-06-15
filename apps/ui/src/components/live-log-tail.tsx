import HighlightedLine from "@/components/highlighted-line";
import { IP_PATTERN } from "@/components/ip-pattern";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type TailLine, useDataSource } from "@/lib/datasource";
import { Eraser, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const MAX_LINES = 500;

interface LiveLogTailProps {
  configId: string;
  regex: string;
  param: string;
}

/** Live tail of the config's watched file — new lines only, starting from
 * mount, with the config's regex matches highlighted like on the Matches page. */
export default function LiveLogTail({
  configId,
  regex,
  param,
}: LiveLogTailProps) {
  const ds = useDataSource();
  const [lines, setLines] = useState<TailLine[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLines([]);
    return ds.streamConfigLines(configId, (line) => {
      setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), line]);
    });
  }, [ds, configId]);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [lines, autoScroll]);

  // Compiled once per regex; null when the Rust pattern is not portable to JS,
  // in which case no line gets the match highlight.
  const jsRegex = useMemo(() => {
    try {
      return new RegExp(regex.replace("<IP>", IP_PATTERN));
    } catch {
      return null;
    }
  }, [regex]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Live log</CardTitle>
          <CardDescription>
            New lines in <span className="font-mono">{param}</span> since
            opening this page — regex matches are highlighted
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
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
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setLines([])}
          >
            <Eraser className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 overflow-auto rounded-md border p-2 font-mono text-xs">
          {lines.length === 0 ? (
            <p className="py-8 text-center font-sans text-sm text-muted-foreground">
              Waiting for new lines…
            </p>
          ) : (
            lines.map((l, i) => (
              <div
                key={i}
                data-testid="live-log-line"
                className="flex flex-wrap gap-x-3 rounded px-1 py-px hover:bg-muted/50"
              >
                <span className="w-20 shrink-0 leading-relaxed tabular-nums text-muted-foreground">
                  {new Date(l.timestamp).toLocaleTimeString()}
                </span>
                <div className="min-w-0 grow basis-full sm:basis-0">
                  {jsRegex?.test(l.line) ? (
                    <HighlightedLine line={l.line} regex={regex} />
                  ) : (
                    <span className="break-all leading-relaxed text-muted-foreground">
                      {l.line}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}
