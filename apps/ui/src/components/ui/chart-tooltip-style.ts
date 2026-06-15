/** Shared tooltip styling that matches the shadcn theme tokens. */
export const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    color: "hsl(var(--popover-foreground))",
    fontSize: "0.75rem",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
} as const;
