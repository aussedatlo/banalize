import { IP_PATTERN } from "./ip-pattern";

interface HighlightedLineProps {
  line: string;
  regex?: string;
  /** The matched IP when known; derived from the matched span when omitted. */
  ip?: string;
}

/**
 * The full raw line with the span the config's regex matched in amber and the
 * extracted IP in red. Falls back to an uncolored line when the regex is
 * missing (deleted config) or not portable to JS.
 */
export default function HighlightedLine({
  line,
  regex,
  ip,
}: HighlightedLineProps) {
  let start = 0;
  let end = line.length;
  if (regex) {
    try {
      const m = new RegExp(regex.replace("<IP>", IP_PATTERN)).exec(line);
      if (m) {
        start = m.index;
        end = m.index + m[0].length;
      }
    } catch {
      // Rust-only regex syntax: highlight the whole line.
    }
  }

  const matched = line.slice(start, end);
  const resolvedIp = ip ?? matched.match(new RegExp(IP_PATTERN))?.[0];
  const ipAt = resolvedIp ? matched.indexOf(resolvedIp) : -1;
  return (
    <p className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
      <span className="text-muted-foreground">{line.slice(0, start)}</span>
      <span className="rounded bg-amber-500/15 px-0.5 text-amber-700 dark:text-amber-300">
        {!resolvedIp || ipAt === -1 ? (
          matched
        ) : (
          <>
            {matched.slice(0, ipAt)}
            <span className="rounded bg-red-500/15 px-0.5 font-semibold text-red-600 dark:text-red-400">
              {resolvedIp}
            </span>
            {matched.slice(ipAt + resolvedIp.length)}
          </>
        )}
      </span>
      <span className="text-muted-foreground">{line.slice(end)}</span>
    </p>
  );
}
