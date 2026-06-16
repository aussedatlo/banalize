import DashboardView from "@/components/DashboardView";
import ConfigFormDialog from "@/components/config-form-dialog";
import EventsTable from "@/components/events-table";
import LiveLogDialog from "@/components/live-log-dialog";
import { Button } from "@/components/ui/button";
import { useDataSource } from "@/lib/datasource";
import { formatDuration } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, ScrollText } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

export default function ConfigDetailPage() {
  const { id = "" } = useParams();
  const ds = useDataSource();
  const [editing, setEditing] = useState(false);
  const [liveLogOpen, setLiveLogOpen] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["config", id],
    queryFn: () => ds.getConfig(id),
  });

  return (
    <div className="space-y-6">
      <Link
        to="/configs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to configs
      </Link>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !config ? (
        <div className="rounded-md border p-10 text-center text-muted-foreground">
          Config <span className="font-mono">{id}</span> not found
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h2
                className="pageTitle text-2xl font-bold"
                data-testid="config-detail-name"
              >
                {config.name}
              </h2>
              <p className="break-all font-mono text-sm text-muted-foreground">
                {config.param}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                <span className="min-w-0 break-all font-mono">
                  {config.regex}
                </span>
                <span>
                  bans after {config.max_matches} hits in{" "}
                  {formatDuration(config.find_time)} · for{" "}
                  {formatDuration(config.ban_time)}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                data-testid="config-detail-live-log"
                onClick={() => setLiveLogOpen(true)}
              >
                <ScrollText className="mr-2 h-4 w-4" />
                Live log
              </Button>
              <Button
                variant="outline"
                data-testid="config-detail-edit"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
          <ConfigFormDialog
            open={editing}
            onOpenChange={setEditing}
            initial={config}
          />
          <LiveLogDialog
            configId={config.id}
            regex={config.regex}
            param={config.param}
            open={liveLogOpen}
            onOpenChange={setLiveLogOpen}
          />

          <DashboardView configId={config.id} />

          <EventsTable configId={config.id} />
        </>
      )}
    </div>
  );
}
