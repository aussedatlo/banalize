import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataSourceProvider, dataSource } from "@/lib/datasource";
import { useLiveEvents } from "@/lib/use-live-events";
import Sidebar from "@/components/layout/Sidebar";
import DashboardPage from "@/pages/DashboardPage";
import ConfigsPage from "@/pages/ConfigsPage";
import ConfigDetailPage from "@/pages/ConfigDetailPage";
import BansPage from "@/pages/BansPage";
import MatchesPage from "@/pages/MatchesPage";
import OffendersPage from "@/pages/OffendersPage";
import NotificationsPage from "@/pages/NotificationsPage";
import LogsPage from "@/pages/LogsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5_000 },
  },
});

/** Holds the app-wide live event subscription; renders nothing. */
function LiveEventsBridge() {
  useLiveEvents();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataSourceProvider value={dataSource}>
        <LiveEventsBridge />
        <BrowserRouter>
          <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/configs" element={<ConfigsPage />} />
                <Route path="/configs/:id" element={<ConfigDetailPage />} />
                <Route path="/bans" element={<BansPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/offenders" element={<OffendersPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/logs" element={<LogsPage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </DataSourceProvider>
    </QueryClientProvider>
  );
}
