export type Period = "all" | "month" | "week" | "day";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "month", label: "Last month" },
  { value: "week", label: "Last week" },
  { value: "day", label: "Last day" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const PERIOD_MS: Record<Exclude<Period, "all">, number> = {
  month: 30 * DAY_MS,
  week: 7 * DAY_MS,
  day: DAY_MS,
};

/** Start of the period as a ms epoch, or undefined for "all". */
export function periodStart(period: Period, now = Date.now()): number | undefined {
  return period === "all" ? undefined : now - PERIOD_MS[period];
}
