import type { IpInfo } from "@/lib/datasource";

/**
 * Country flag for an IP, with the country name on hover. Renders a fixed
 * width placeholder while unknown so table columns don't shift when the
 * geo data arrives.
 */
export default function IpFlag({ info }: { info?: IpInfo }) {
  return (
    <span
      className="inline-block w-5 text-center"
      title={info?.country_name ?? undefined}
      aria-label={info?.country_name ?? undefined}
    >
      {info?.flag ?? ""}
    </span>
  );
}
