import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Derive a config id from its display name: lowercase, diacritics stripped,
 * non-alphanumeric runs collapsed to single dashes. Capped at 24 chars to fit
 * the backend's iptables chain-name budget without hash suffixes.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/, "");
}

/** Validate a single IPv4/IPv6 address with an optional CIDR prefix. */
export function isValidIpOrCidr(entry: string): boolean {
  const parts = entry.split("/");
  if (parts.length > 2 || !parts[0]) return false;
  const [addr, prefix] = parts;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(addr);
  if (v4) {
    if (v4.slice(1).some((o) => Number(o) > 255)) return false;
    return prefix === undefined || isPrefixInRange(prefix, 32);
  }

  // IPv6: hex groups with at most one "::" compression. v4-mapped notation is
  // not accepted, keeping the check simple — the backend validates again.
  if (!addr.includes(":") || /:::/.test(addr)) return false;
  if (addr !== "::" && (/^:(?!:)/.test(addr) || /(?<!:):$/.test(addr)))
    return false;
  const compressions = addr.split("::").length - 1;
  if (compressions > 1) return false;
  const groups = addr.split(/::?/).filter(Boolean);
  const groupsValid =
    groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g)) &&
    (compressions === 1 ? groups.length <= 7 : groups.length === 8);
  if (!groupsValid && addr !== "::") return false;
  return prefix === undefined || isPrefixInRange(prefix, 128);
}

function isPrefixInRange(prefix: string, max: number): boolean {
  if (!/^\d{1,3}$/.test(prefix)) return false;
  return Number(prefix) <= max;
}
