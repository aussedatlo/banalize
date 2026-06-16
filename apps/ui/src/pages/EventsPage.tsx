import EventsTable from "@/components/events-table";
import { useSearchParams } from "react-router-dom";

export default function EventsPage() {
  // ?q= pre-fills the search, e.g. when clicking an IP on the Offenders page.
  const [searchParams] = useSearchParams();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="pageTitle text-2xl font-bold">Events</h2>
        <p className="text-muted-foreground">
          Matches, bans and unbans across all configs — search an IP to see its
          full timeline
        </p>
      </div>

      <EventsTable initialSearch={searchParams.get("q") ?? ""} />
    </div>
  );
}
