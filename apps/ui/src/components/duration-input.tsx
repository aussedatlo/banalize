import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNITS = [
  { value: "ms", label: "ms", ms: 1 },
  { value: "sec", label: "sec", ms: 1000 },
  { value: "min", label: "min", ms: 60_000 },
  { value: "hour", label: "hour", ms: 3_600_000 },
  { value: "day", label: "day", ms: 86_400_000 },
] as const;

type Unit = (typeof UNITS)[number]["value"];

function unitMs(unit: Unit): number {
  return UNITS.find((u) => u.value === unit)!.ms;
}

/** Largest unit that divides the duration evenly (3600000 → 1 hour). */
function bestFit(ms: number): { amount: number; unit: Unit } {
  for (const u of [...UNITS].reverse()) {
    if (ms >= u.ms && ms % u.ms === 0) {
      return { amount: ms / u.ms, unit: u.value };
    }
  }
  return { amount: ms, unit: "ms" };
}

interface DurationInputProps {
  id: string;
  /** Duration in milliseconds. */
  value: number;
  onChange: (ms: number) => void;
}

/** A duration field as an amount plus a unit, emitting milliseconds. */
export default function DurationInput({ id, value, onChange }: DurationInputProps) {
  const [{ amount, unit }, setState] = useState(() => bestFit(value));

  // Re-derive amount/unit when the value changes from outside (e.g. the form
  // is re-seeded for edit mode) rather than from our own emit.
  const lastEmitted = useRef(value);
  if (value !== lastEmitted.current) {
    lastEmitted.current = value;
    setState(bestFit(value));
  }

  const emit = (nextAmount: number, nextUnit: Unit) => {
    setState({ amount: nextAmount, unit: nextUnit });
    if (nextAmount > 0) {
      lastEmitted.current = nextAmount * unitMs(nextUnit);
      onChange(lastEmitted.current);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="number"
        min={1}
        required
        className="min-w-0 flex-1"
        value={Number.isNaN(amount) ? "" : amount}
        onChange={(e) => emit(e.target.valueAsNumber, unit)}
      />
      <Select value={unit} onValueChange={(u) => emit(amount, u as Unit)}>
        <SelectTrigger
          className="w-[5.5rem] shrink-0"
          aria-label="Duration unit"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {UNITS.map((u) => (
            <SelectItem key={u.value} value={u.value}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
