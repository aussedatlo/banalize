import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { useDataSource } from "@/lib/datasource";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ConfigFormDialog from "@/components/config-form-dialog";

export default function ConfigsPage() {
  const ds = useDataSource();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["configs"],
    queryFn: () => ds.getConfigs(),
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => ds.deleteConfig(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["configs"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configs</h2>
          <p className="text-muted-foreground">Manage log-watching configurations</p>
        </div>
        <Button data-testid="config-create-button" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New config
        </Button>
        <ConfigFormDialog open={open} onOpenChange={setOpen} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : configs.length === 0 ? (
        <div
          data-testid="configs-empty"
          className="rounded-md border p-10 text-center text-muted-foreground"
        >
          No configs yet
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {configs.map((c) => (
            <Link
              key={c.id}
              to={`/configs/${c.id}`}
              data-testid={`config-card-${c.id}`}
              className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <p className="font-mono text-xs text-muted-foreground">{c.id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Delete ${c.id}`}
                    data-testid={`config-delete-${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-mono text-xs">{c.param}</span>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {c.regex}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground">
                      bans after{" "}
                      <span className="font-medium text-foreground">
                        {c.max_matches} hits
                      </span>{" "}
                      in {formatDuration(c.find_time)} · for{" "}
                      {formatDuration(c.ban_time)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
