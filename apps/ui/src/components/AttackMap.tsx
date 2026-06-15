import { countryFill } from "@/lib/country-color";
import type { CountryStats } from "@/lib/datasource";
import type { GeoPermissibleObjects } from "d3-geo";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useMemo, useState } from "react";

import worldGeo from "@/assets/world.geo.json";

const WIDTH = 800;
const HEIGHT = 380;

type CountryFeature = {
  type: "Feature";
  properties: { iso: string | null; name: string };
  geometry: GeoPermissibleObjects;
};

const features = (worldGeo as { features: CountryFeature[] }).features;

// Precompute the projection + path strings once: the geometry never changes,
// only the per-country fill does.
const paths = (() => {
  const projection = geoNaturalEarth1().fitSize(
    [WIDTH, HEIGHT],
    worldGeo as GeoPermissibleObjects,
  );
  const path = geoPath(projection);
  return features.map((f) => ({
    iso: f.properties.iso,
    name: f.properties.name,
    d: path(f.geometry) ?? "",
  }));
})();

type Hover = { name: string; bans: number; x: number; y: number } | null;

/**
 * World choropleth of attacking countries, shaded by ban count. Country stats
 * are keyed by ISO 3166-1 alpha-2, matching the `iso` baked into the geometry.
 */
export default function AttackMap({ data }: { data: CountryStats[] }) {
  const [hover, setHover] = useState<Hover>(null);

  const bansByIso = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data) m.set(c.country_code, c.ban_count);
    return m;
  }, [data]);

  const max = useMemo(
    () => data.reduce((acc, c) => Math.max(acc, c.ban_count), 0),
    [data],
  );

  if (data.length === 0) {
    return (
      <p
        data-testid="attack-map-empty"
        className="py-12 text-center text-sm text-muted-foreground"
      >
        No geolocated activity yet
      </p>
    );
  }

  return (
    <div className="relative w-full" data-testid="attack-map">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Bans by country"
      >
        {paths.map((p) => {
          const bans = p.iso ? (bansByIso.get(p.iso) ?? 0) : 0;
          return (
            <path
              key={`${p.iso ?? "unk"}-${p.name}`}
              d={p.d}
              data-testid={p.iso ? `attack-map-country-${p.iso}` : undefined}
              data-bans={bans}
              fill={countryFill(bans, max)}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              onMouseMove={(e) => {
                const box =
                  e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                setHover({
                  name: p.name,
                  bans,
                  x: e.clientX - (box?.left ?? 0),
                  y: e.clientY - (box?.top ?? 0),
                });
              }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <span className="font-medium">{hover.name}</span>
          {" — "}
          <span className="tabular-nums">{hover.bans}</span> bans
        </div>
      ) : null}
    </div>
  );
}
