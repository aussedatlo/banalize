import { cn } from "@/lib/utils";
import * as React from "react";
import { ResponsiveContainer } from "recharts";

export type ChartConfig = Record<string, { label: string; color?: string }>;

/**
 * Lightweight recharts wrapper: exposes each series colour as a
 * `--color-<key>` CSS variable and provides a responsive sized box.
 */
export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactElement;
}) {
  const style = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (value.color) vars[`--color-${key}`] = value.color;
    }
    return vars as React.CSSProperties;
  }, [config]);

  return (
    <div className={cn("h-64 w-full", className)} style={style}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
