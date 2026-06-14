import { NavLink } from "react-router-dom";
import { Activity, Bell, LayoutDashboard, ScrollText, Settings, Shield, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/configs", icon: Settings, label: "Configs" },
  { to: "/bans", icon: Shield, label: "Bans" },
  { to: "/matches", icon: Activity, label: "Matches" },
  { to: "/offenders", icon: UserX, label: "Offenders" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
];

export default function Sidebar() {
  return (
    <div className="flex w-56 flex-col border-r bg-card">
      <div className="p-5">
        <h1 className="text-lg font-bold">Banalize</h1>
        <p className="text-xs text-muted-foreground">IP ban management</p>
      </div>
      <Separator />
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={`nav-link-${to.slice(1)}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
