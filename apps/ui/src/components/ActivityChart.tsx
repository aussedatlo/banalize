import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { chartTooltipStyle } from "@/components/ui/chart-tooltip-style";
import type { BanEvent, MatchEvent } from "@/lib/datasource";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const HOUR = 60 * 60 * 1000;
const WINDOW_HOURS = 24;

const config: ChartConfig = {
  matches: { label: "Matches", color: "hsl(217 91% 60%)" },
  bans: { label: "Bans", color: "hsl(0 72% 51%)" },
};

interface Bucket {
  label: string;
  matches: number;
  bans: number;
}

function bucketByHour(matches: MatchEvent[], bans: BanEvent[]): Bucket[] {
  const now = Date.now();
  const start = Math.floor((now - WINDOW_HOURS * HOUR) / HOUR) * HOUR;
  const buckets: Bucket[] = [];
  const index = new Map<number, Bucket>();

  for (let i = 0; i <= WINDOW_HOURS; i++) {
    const t = start + i * HOUR;
    const bucket: Bucket = {
      label: new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      matches: 0,
      bans: 0,
    };
    buckets.push(bucket);
    index.set(t, bucket);
  }

  const tally = (ts: number, key: "matches" | "bans") => {
    const t = Math.floor(ts / HOUR) * HOUR;
    const bucket = index.get(t);
    if (bucket) bucket[key] += 1;
  };

  for (const m of matches) tally(m.timestamp, "matches");
  for (const b of bans) tally(b.timestamp, "bans");

  return buckets;
}

export default function ActivityChart({
  matches,
  bans,
}: {
  matches: MatchEvent[];
  bans: BanEvent[];
}) {
  const data = useMemo(() => bucketByHour(matches, bans), [matches, bans]);
  const empty = matches.length === 0 && bans.length === 0;

  if (empty) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No activity in the last 24 hours
      </div>
    );
  }

  return (
    <ChartContainer config={config}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fill-matches" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-matches)"
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor="var(--color-matches)"
              stopOpacity={0.05}
            />
          </linearGradient>
          <linearGradient id="fill-bans" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-bans)" stopOpacity={0.4} />
            <stop
              offset="95%"
              stopColor="var(--color-bans)"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeOpacity={0.15} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          fontSize={11}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          allowDecimals={false}
          fontSize={11}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip
          {...chartTooltipStyle}
          cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconType="circle"
          iconSize={7}
          formatter={(value: string) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="matches"
          name="Matches"
          stroke="var(--color-matches)"
          fill="url(#fill-matches)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="bans"
          name="Bans"
          stroke="var(--color-bans)"
          fill="url(#fill-bans)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
