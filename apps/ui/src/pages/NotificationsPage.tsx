import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, Pencil, Plus, Send, Trash2 } from "lucide-react";
import {
  type NotifierConfig,
  type NotifierTestResult,
  useDataSource,
} from "@/lib/datasource";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import NotifierFormDialog from "@/components/notifier-form-dialog";

function NotifierCard({
  notifier,
  onEdit,
  onDelete,
}: {
  notifier: NotifierConfig;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ds = useDataSource();
  const {
    mutate: test,
    isPending: testing,
    data: testResult,
  } = useMutation<NotifierTestResult, Error>({
    mutationFn: () => ds.testNotifier(notifier.id),
  });

  const isEmail = Boolean(notifier.email_config);
  const Icon = isEmail ? Mail : MessageSquare;
  const title = isEmail
    ? notifier.email_config?.recipient_email
    : notifier.signal_config?.recipients.join(", ");
  const server = isEmail
    ? `${notifier.email_config?.server}:${notifier.email_config?.port}`
    : notifier.signal_config?.server;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base">{title}</CardTitle>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {server}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={`Delete notifier ${notifier.id}`}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-1.5">
          {notifier.events.map((event) => (
            <Badge key={event} variant="secondary">
              {event}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={testing}
            onClick={() => test()}
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            {testing ? "Sending…" : "Test"}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        {testResult ? (
          <p
            className={cn(
              "text-xs",
              testResult.success ? "text-green-500" : "text-destructive",
            )}
          >
            {testResult.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const ds = useDataSource();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NotifierConfig | undefined>();

  const { data: notifiers = [], isLoading } = useQuery({
    queryKey: ["notifiers"],
    queryFn: () => ds.getNotifiers(),
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => ds.deleteNotifier(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifiers"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-muted-foreground">
            Send alerts when IPs match or get banned
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New notifier
        </Button>
        <NotifierFormDialog
          open={open}
          onOpenChange={setOpen}
          initial={editing}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : notifiers.length === 0 ? (
        <div className="rounded-md border p-10 text-center text-muted-foreground">
          No notifiers yet
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notifiers.map((notifier) => (
            <NotifierCard
              key={notifier.id}
              notifier={notifier}
              onEdit={() => {
                setEditing(notifier);
                setOpen(true);
              }}
              onDelete={() => remove(notifier.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
