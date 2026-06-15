import LiveLogTail from "@/components/live-log-tail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LiveLogDialogProps {
  configId: string;
  regex: string;
  param: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Hosts the live log tail in a modal. The tail (and its SSE stream / backend
 * file watcher) only mounts while the dialog is open, so it costs nothing when
 * the user is just reading the config's event history.
 */
export default function LiveLogDialog({
  configId,
  regex,
  param,
  open,
  onOpenChange,
}: LiveLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Live log</DialogTitle>
          <DialogDescription>
            Streams new lines while this dialog is open. Closing it stops the
            stream.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <LiveLogTail configId={configId} regex={regex} param={param} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
