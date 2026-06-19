import Logo from "@/components/layout/Logo";
import MobileNav from "@/components/layout/MobileNav";
import Sidebar from "@/components/layout/Sidebar";
import StatusBar from "@/components/layout/StatusBar";
import { Button } from "@/components/ui/button";
import { DataSourceProvider, dataSource } from "@/lib/datasource";
import { useLiveEvents } from "@/lib/use-live-events";
import ConfigDetailPage from "@/pages/ConfigDetailPage";
import ConfigsPage from "@/pages/ConfigsPage";
import DashboardPage from "@/pages/DashboardPage";
import EventsPage from "@/pages/EventsPage";
import LogsPage from "@/pages/LogsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import OffendersPage from "@/pages/OffendersPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <DataSourceProvider value={dataSource}>
        <LiveEventsBridge />
        <BrowserRouter>
          <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed((c) => !c)}
            />
            <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex items-center gap-2 border-b bg-card p-3 md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Logo className="h-8 w-10 shrink-0" />
                <span className="brandWordmark text-lg font-semibold tracking-tight">
                  banalize
                </span>
              </header>
              <main className="flex-1 overflow-auto p-4 md:p-6">
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/configs" element={<ConfigsPage />} />
                  <Route path="/configs/:id" element={<ConfigDetailPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route
                    path="/bans"
                    element={<Navigate to="/events" replace />}
                  />
                  <Route
                    path="/matches"
                    element={<Navigate to="/events" replace />}
                  />
                  <Route path="/offenders" element={<OffendersPage />} />
                  <Route
                    path="/notifications"
                    element={<NotificationsPage />}
                  />
                  <Route path="/logs" element={<LogsPage />} />
                </Routes>
              </main>
              <StatusBar />
            </div>
          </div>
        </BrowserRouter>
      </DataSourceProvider>
    </QueryClientProvider>
  );
}
