import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Config } from "@/lib/datasource";
import { type Period, PERIODS } from "@/lib/period";
import { Search } from "lucide-react";

interface EventTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  configId: string;
  onConfigIdChange: (value: string) => void;
  configs: Config[];
  period: Period;
  onPeriodChange: (value: Period) => void;
  searchPlaceholder?: string;
}

/** Search + config + time-period filter row shared by the event tables. */
export default function EventTableToolbar({
  search,
  onSearchChange,
  configId,
  onConfigIdChange,
  configs,
  period,
  onPeriodChange,
  searchPlaceholder = "Search by IP…",
}: EventTableToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          className="pl-8"
          data-testid="table-search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={configId} onValueChange={onConfigIdChange}>
        <SelectTrigger className="w-full sm:w-48" aria-label="Filter by config">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All configs</SelectItem>
          {configs.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
        <SelectTrigger className="w-full sm:w-36" aria-label="Filter by period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
