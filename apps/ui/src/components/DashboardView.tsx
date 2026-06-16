import ActivityChart from "@/components/ActivityChart";
import AttackMap from "@/components/AttackMap";
import TopCountries from "@/components/TopCountries";
import TopOffenders from "@/components/TopOffenders";
import LiveLogTail from "@/components/live-log-tail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataSource } from "@/lib/datasource";
import { useCountUp } from "@/lib/use-count-up";
import { useQuery } from "@tanstack/react-query";
import { Activity, Shield, ShieldOff } from "lucide-react";

/** Renders a number that counts up from 0 on mount and whenever it changes. */
function AnimatedNumber({ value }: { value: number }) {
  return <>{useCountUp(value).toLocaleString()}</>;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  testId,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple text-white shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            data-testid={`${testId}-value`}
            className="text-3xl font-bold leading-tight tabular-nums"
          >
            {typeof value === "number" ? (
              <AnimatedNumber value={value} />
            ) : (
              value
            )}
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
  const { data: countryStats = [] } = useQuery({
    queryKey: ["country-stats", scope],
    queryFn: () => ds.getCountryStats(configId),
  });
  // Only when scoped to a config: shares the cache with ConfigDetailPage's
  // ["config", id] query, so this adds no extra request.
  const { data: scopedConfig } = useQuery({
    queryKey: ["config", configId],
    queryFn: () => ds.getConfig(configId as string),
    enabled: configId !== undefined,
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
          testId="stat-bans"
        />
        <StatCard
          title="Matches (24h)"
          value={recentMatches}
          icon={Activity}
          description="Log matches in last 24 hours"
          testId="stat-matches"
        />
        <StatCard
          title="Unbans"
          value={unbans.length}
          icon={ShieldOff}
          description="Lifted or expired bans"
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

      {/* Map on the left; top-countries and top-offenders stacked on the right.
          Side by side on desktop, stacked on mobile. */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attacks by country</CardTitle>
          </CardHeader>
          <CardContent>
            <AttackMap data={countryStats} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <TopCountries data={countryStats} className="flex-1" />
          <TopOffenders configId={configId} className="flex-1" />
        </div>
      </div>

      {/* Config-scoped only: the live tail of the watched file, full width. */}
      {scopedConfig ? (
        <LiveLogTail
          configId={scopedConfig.id}
          regex={scopedConfig.regex}
          param={scopedConfig.param}
        />
      ) : null}
    </div>
  );
}
