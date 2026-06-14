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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ApiError,
  type NotifierConfig,
  type NotifierEventType,
  useDataSource,
} from "@/lib/datasource";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type NotifierKind = "email" | "signal";

const ALL_EVENTS: NotifierEventType[] = ["ban", "unban", "match"];

interface FormState {
  kind: NotifierKind;
  events: NotifierEventType[];
  email: {
    server: string;
    port: number;
    username: string;
    password: string;
    recipient_email: string;
  };
  signal: { server: string; number: string; recipients: string };
}

const defaultForm = (): FormState => ({
  kind: "email",
  events: ["ban"],
  email: {
    server: "",
    port: 587,
    username: "",
    password: "",
    recipient_email: "",
  },
  signal: { server: "", number: "", recipients: "" },
});

function fromConfig(config: NotifierConfig): FormState {
  return {
    kind: config.signal_config ? "signal" : "email",
    events: config.events,
    email: config.email_config
      ? { ...config.email_config }
      : defaultForm().email,
    signal: config.signal_config
      ? {
          ...config.signal_config,
          recipients: config.signal_config.recipients.join(", "),
        }
      : defaultForm().signal,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 400)
    return "The backend rejected the notifier — check the fields.";
  return "Something went wrong while saving the notifier.";
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
  );
}

interface NotifierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode; fields are prefilled. */
  initial?: NotifierConfig;
}

/** Shared create/edit notifier dialog. */
export default function NotifierFormDialog({
  open,
  onOpenChange,
  initial,
}: NotifierFormDialogProps) {
  const ds = useDataSource();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(defaultForm);

  // Re-seed whenever the dialog opens (fresh create form, or current values).
  useEffect(() => {
    if (open) setForm(initial ? fromConfig(initial) : defaultForm());
  }, [open, initial]);

  const {
    mutate: save,
    isPending,
    error,
    reset,
  } = useMutation({
    mutationFn: (notifier: NotifierConfig) =>
      initial ? ds.updateNotifier(notifier) : ds.createNotifier(notifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifiers"] });
      onOpenChange(false);
    },
  });

  const toggleEvent = (event: NotifierEventType) =>
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }));

  const setEmail = <K extends keyof FormState["email"]>(
    key: K,
    value: FormState["email"][K],
  ) => setForm((f) => ({ ...f, email: { ...f.email, [key]: value } }));

  const setSignal = <K extends keyof FormState["signal"]>(
    key: K,
    value: FormState["signal"][K],
  ) => setForm((f) => ({ ...f, signal: { ...f.signal, [key]: value } }));

  const submit = () => {
    save({
      id: initial?.id ?? "",
      events: form.events,
      email_config: form.kind === "email" ? { ...form.email } : null,
      signal_config:
        form.kind === "signal"
          ? {
              ...form.signal,
              recipients: form.signal.recipients
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean),
            }
          : null,
    });
  };

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
          <DialogTitle>
            {initial ? "Edit notifier" : "Create notifier"}
          </DialogTitle>
          <DialogDescription>
            Get notified by email or Signal message when events occur.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          data-testid="notifier-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label>Events</Label>
            <div className="flex gap-2">
              {ALL_EVENTS.map((event) => (
                <button
                  key={event}
                  type="button"
                  data-testid={`notifier-event-${event}`}
                  aria-pressed={form.events.includes(event)}
                  onClick={() => toggleEvent(event)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    form.events.includes(event)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent",
                  )}
                >
                  {event}
                </button>
              ))}
            </div>
            <Hint>
              Which events trigger this notifier. Match fires on every single
              match — it can be noisy.
            </Hint>
          </div>

          <div className="grid gap-1.5">
            <Label>Channel</Label>
            <Select
              value={form.kind}
              onValueChange={(kind) =>
                setForm((f) => ({ ...f, kind: kind as NotifierKind }))
              }
            >
              <SelectTrigger aria-label="Channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email (SMTP)</SelectItem>
                <SelectItem value="signal">Signal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {form.kind === "email" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="email-server">SMTP server</Label>
                  <Input
                    id="email-server"
                    placeholder="smtp.gmail.com"
                    value={form.email.server}
                    onChange={(e) => setEmail("server", e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email-port">Port</Label>
                  <Input
                    id="email-port"
                    type="number"
                    min={1}
                    max={65535}
                    value={form.email.port}
                    onChange={(e) => setEmail("port", e.target.valueAsNumber)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="email-username">Username</Label>
                  <Input
                    id="email-username"
                    placeholder="alerts@example.com"
                    value={form.email.username}
                    onChange={(e) => setEmail("username", e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email-password">Password</Label>
                  <Input
                    id="email-password"
                    type="password"
                    value={form.email.password}
                    onChange={(e) => setEmail("password", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email-recipient">Recipient</Label>
                <Input
                  id="email-recipient"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email.recipient_email}
                  onChange={(e) => setEmail("recipient_email", e.target.value)}
                  required
                />
                <Hint>
                  Sent from the username address. Port 465 uses implicit TLS,
                  other ports use STARTTLS when available.
                </Hint>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="signal-server">API endpoint</Label>
                <Input
                  id="signal-server"
                  className="font-mono"
                  placeholder="http://localhost:8080/v2/send"
                  value={form.signal.server}
                  onChange={(e) => setSignal("server", e.target.value)}
                  required
                />
                <Hint>URL of a signal-cli REST API send endpoint.</Hint>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="signal-number">Sender number</Label>
                <Input
                  id="signal-number"
                  placeholder="+33612345678"
                  value={form.signal.number}
                  onChange={(e) => setSignal("number", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="signal-recipients">Recipients</Label>
                <Input
                  id="signal-recipients"
                  placeholder="+33687654321, +33611223344"
                  value={form.signal.recipients}
                  onChange={(e) => setSignal("recipients", e.target.value)}
                  required
                />
                <Hint>Comma-separated phone numbers.</Hint>
              </div>
            </>
          )}

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
            <Button
              type="submit"
              data-testid="notifier-form-submit"
              disabled={isPending || form.events.length === 0}
            >
              {isPending
                ? "Saving…"
                : initial
                  ? "Save changes"
                  : "Create notifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
