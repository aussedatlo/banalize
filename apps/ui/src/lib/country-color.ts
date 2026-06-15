/** Brand blue→purple shade for a country's share of the heaviest offender,
 * mirroring the stat-card gradient (--brand-blue 230° → --brand-purple 263°).
 * Shared by the attack map and the top-countries bars so their colors match. */
export function countryFill(count: number, max: number): string {
  if (count <= 0) return "hsl(var(--muted))";
  const t = max > 0 ? count / max : 0;
  // Low counts: light blue; high counts: deep brand purple.
  const hue = Math.round(230 + t * 33);
  const lightness = Math.round(85 - t * 32);
  return `hsl(${hue} 85% ${lightness}%)`;
}
