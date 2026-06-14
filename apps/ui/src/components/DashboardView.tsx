import ActivityChart from "@/components/ActivityChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataSource } from "@/lib/datasource";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Activity, Shield, ShieldOff } from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  tint,
  testId,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description: string;
  tint: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            tint,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            data-testid={`${testId}-value`}
            className="text-3xl font-bold leading-tight tabular-nums"
          >
            {value}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Stat cards + activity chart. When `configId` is given the data is scoped to
 * that single config; otherwise it spans every config.
 */
export default function DashboardView({ configId }: { configId?: string }) {
  const ds = useDataSource();
  const scope = configId ?? "all";

  const { data: bans = [] } = useQuery({
    queryKey: ["bans", scope],
    queryFn: () => ds.getBans(configId),
  });
  const { data: matches = [] } = useQuery({
    queryKey: ["matches", scope],
    queryFn: () => ds.getMatches(configId),
  });
  const { data: unbans = [] } = useQuery({
    queryKey: ["unbans", scope],
    queryFn: () => ds.getUnbans(configId),
  });

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentMatches = matches.filter((m) => m.timestamp > dayAgo).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total bans"
          value={bans.length}
          icon={Shield}
          description="Ban events recorded"
          tint="bg-red-500/10 text-red-600 dark:text-red-400"
          testId="stat-bans"
        />
        <StatCard
          title="Matches (24h)"
          value={recentMatches}
          icon={Activity}
          description="Log matches in last 24 hours"
          tint="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          testId="stat-matches"
        />
        <StatCard
          title="Unbans"
          value={unbans.length}
          icon={ShieldOff}
          description="Lifted or expired bans"
          tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          testId="stat-unbans"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity (last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityChart matches={matches} bans={bans} />
        </CardContent>
      </Card>
    </div>
  );
}
