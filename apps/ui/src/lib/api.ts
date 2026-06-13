// Data fetching now lives behind the injected DataSource abstraction.
// See `@/lib/datasource`. This module only re-exports the shared model types
// for convenience / backwards-compatible imports.
export type {
  BanEvent,
  Config,
  LogEntry,
  LogLevel,
  MatchEvent,
  UnbanEvent,
} from "@/lib/datasource/types";
