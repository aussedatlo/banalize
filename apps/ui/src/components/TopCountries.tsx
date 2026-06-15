import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { countryFill } from "@/lib/country-color";
import type { CountryStats } from "@/lib/datasource";
import { cn } from "@/lib/utils";

const MAX_ROWS = 6;

/** Ranked leaderboard of attacking countries, bars colored to match the map. */
export default function TopCountries({
  data,
  className,
}: {
  data: CountryStats[];
  className?: string;
}) {
  const rows = [...data]
    .sort((a, b) => b.ban_count - a.ban_count)
    .slice(0, MAX_ROWS);
  const max = rows.reduce((acc, c) => Math.max(acc, c.ban_count), 0);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top countries</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {rows.length === 0 ? (
          <p
            data-testid="top-countries-empty"
            className="py-12 text-center text-sm text-muted-foreground"
          >
            No geolocated activity yet
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((c) => (
              <li
                key={c.country_code}
                data-testid={`top-countries-${c.country_code}`}
                className="flex items-center gap-3"
              >
                <span className="w-5 shrink-0 text-center">{c.flag ?? ""}</span>
                <span className="w-32 shrink-0 truncate text-sm">
                  {c.country_name ?? c.country_code}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${max > 0 ? (c.ban_count / max) * 100 : 0}%`,
                      backgroundColor: countryFill(c.ban_count, max),
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm tabular-nums">
                  {c.ban_count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
