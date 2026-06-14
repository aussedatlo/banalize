import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="pageTitle text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Overview of ban activity</p>
      </div>
      <DashboardView />
    </div>
  );
}
