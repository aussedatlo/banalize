import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, type Config, useDataSource } from "@/lib/datasource";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import DurationInput from "@/components/duration-input";
import IgnoreIpsInput from "@/components/ignore-ips-input";

const defaultForm = (): Omit<Config, "id"> => ({
  name: "",
  param: "",
  regex: "",
  ban_time: 3_600_000,
  find_time: 600_000,
  max_matches: 5,
  ignore_ips: [],
});

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409)
      return "A config with this id already exists — choose a different name.";
    if (error.status === 400)
      return "The backend rejected the config — check the regex and values.";
  }
  return "Something went wrong while saving the config.";
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

interface ConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode; the id is fixed and fields are prefilled. */
  initial?: Config;
  onSaved?: (config: Config) => void;
}

/** Shared create/edit config dialog. The id is derived from the name. */
export default function ConfigFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: ConfigFormDialogProps) {
  const ds = useDataSource();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Omit<Config, "id">>(defaultForm);

  // Re-seed whenever the dialog opens (fresh create form, or current values).
  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : defaultForm());
  }, [open, initial]);

  const id = initial ? initial.id : slugify(form.name);

  const {
    mutate: save,
    isPending,
    error,
    reset,
  } = useMutation({
    mutationFn: (config: Config) =>
      initial ? ds.updateConfig(config) : ds.createConfig(config),
    onSuccess: (config) => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      queryClient.invalidateQueries({ queryKey: ["config", config.id] });
      onOpenChange(false);
      onSaved?.(config);
    },
  });

  const set = <K extends keyof Omit<Config, "id">>(key: K, value: Config[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit config" : "Create config"}</DialogTitle>
          <DialogDescription>
            Watch a log file and automatically ban IPs that match a pattern too
            often.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            save({ ...form, id });
          }}
        >
          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="name">Name</Label>
              {id ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  id: {id}
                </span>
              ) : null}
            </div>
            <Input
              id="name"
              placeholder="SSH Brute Force"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="param">Log file path</Label>
            <Input
              id="param"
              className="font-mono"
              placeholder="/var/log/auth.log"
              value={form.param}
              onChange={(e) => set("param", e.target.value)}
              required
            />
            <Hint>Absolute path to the log file the daemon will tail.</Hint>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="regex">Pattern</Label>
            <Input
              id="regex"
              className="font-mono"
              placeholder="Failed password .* from <IP>"
              value={form.regex}
              onChange={(e) => set("regex", e.target.value)}
              required
            />
            <Hint>
              Regex matched against every new line. Use{" "}
              <code className="rounded bg-muted px-1 font-mono">&lt;IP&gt;</code>{" "}
              where the offender&apos;s address appears.
            </Hint>
          </div>

          <Separator />

          <div className="grid gap-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="max_matches">Max matches</Label>
                <Input
                  id="max_matches"
                  type="number"
                  min={1}
                  required
                  value={form.max_matches}
                  onChange={(e) => set("max_matches", e.target.valueAsNumber)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="find_time">Find window</Label>
                <DurationInput
                  id="find_time"
                  value={form.find_time}
                  onChange={(ms) => set("find_time", ms)}
                />
              </div>
            </div>
            <Hint>
              An IP is banned once it reaches this many matches within the find
              window.
            </Hint>
          </div>

          <div className="grid gap-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ban_time">Ban duration</Label>
                <DurationInput
                  id="ban_time"
                  value={form.ban_time}
                  onChange={(ms) => set("ban_time", ms)}
                />
              </div>
            </div>
            <Hint>How long the firewall blocks the IP before it is lifted.</Hint>
          </div>

          <Separator />

          <div className="grid gap-1.5">
            <Label htmlFor="ignore_ips">Ignore IPs / CIDRs</Label>
            <IgnoreIpsInput
              id="ignore_ips"
              value={form.ignore_ips}
              onChange={(ips) => set("ignore_ips", ips)}
            />
            <Hint>Addresses and ranges that are never banned.</Hint>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage(error)}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !id}>
              {isPending
                ? "Saving…"
                : initial
                  ? "Save changes"
                  : "Create config"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
