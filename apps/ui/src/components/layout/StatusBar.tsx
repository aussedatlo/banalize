import { useStatus, type HealthState } from "@/lib/use-status";
import { cn } from "@/lib/utils";

const DOT_COLOR: Record<HealthState, string> = {
  online: "bg-green-500",
  offline: "bg-destructive",
  pending: "bg-amber-500",
};

const DOT_LABEL: Record<HealthState, string> = {
  online: "Backend online",
  offline: "Backend offline",
  pending: "Checking backend…",
};

/**
 * Thin pill bar pinned to the bottom of the content column. Surfaces the UI and
 * core versions and a health dot reflecting backend reachability.
 */
export default function StatusBar() {
  const { coreVersion, health } = useStatus();

  return (
    <footer
      data-testid="status-bar"
      className="flex items-center gap-2 border-t bg-card px-4 py-1.5 text-xs text-muted-foreground"
    >
      <span
        data-testid="status-bar-dot"
        data-status={health}
        title={DOT_LABEL[health]}
        aria-label={DOT_LABEL[health]}
        className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLOR[health])}
      />
      <span data-testid="status-bar-ui-version">ui {__APP_VERSION__}</span>
      <span aria-hidden>·</span>
      <span data-testid="status-bar-core-version">
        core {coreVersion ?? "—"}
      </span>
    </footer>
  );
}
