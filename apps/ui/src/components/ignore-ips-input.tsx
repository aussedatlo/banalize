import { useState } from "react";
import { Plus, X } from "lucide-react";
import { isValidIpOrCidr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IgnoreIpsInputProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * List editor for IPs/CIDRs: type an entry and press Enter, comma or the Add
 * button to commit it; pasting a list splits it into entries. Invalid entries
 * are rejected with an inline message. Each entry has its own delete button.
 */
export default function IgnoreIpsInput({ id, value, onChange }: IgnoreIpsInputProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commit = (raw: string) => {
    const entries = raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (entries.length === 0) return;

    const invalid = entries.filter((e) => !isValidIpOrCidr(e));
    if (invalid.length > 0) {
      setError(`Not a valid IP or CIDR: ${invalid.join(", ")}`);
      return;
    }
    onChange([...value, ...entries.filter((e) => !value.includes(e))]);
    setText("");
    setError(null);
  };

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          className="min-w-0 flex-1 font-mono"
          placeholder="192.168.1.0/24, 10.0.0.1, ::1"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(text);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            commit(text + e.clipboardData.getData("text"));
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={text.trim() === ""}
          onClick={() => commit(text)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((entry) => (
            <Badge
              key={entry}
              variant="secondary"
              className="gap-1.5 py-1 pl-2.5 pr-1.5 font-mono text-xs font-normal"
            >
              {entry}
              <button
                type="button"
                aria-label={`Remove ${entry}`}
                className="rounded-full p-0.5 outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => onChange(value.filter((v) => v !== entry))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
