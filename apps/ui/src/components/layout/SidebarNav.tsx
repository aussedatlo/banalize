import Logo from "@/components/layout/Logo";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bell,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserX,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/configs", icon: Settings, label: "Configs" },
  { to: "/events", icon: Activity, label: "Events" },
  { to: "/offenders", icon: UserX, label: "Offenders" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
];

interface SidebarNavProps {
  /** When true, render an icon-only rail (labels hidden). */
  collapsed?: boolean;
  /** Called after a nav link is clicked (e.g. to close the mobile drawer). */
  onNavigate?: () => void;
}

/** Logo header + navigation links, shared by the desktop rail and mobile drawer. */
export default function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  return (
    <>
      <div className={cn("p-5", collapsed && "px-3")}>
        <div className="flex items-center justify-center gap-2">
          <Logo className="h-10 w-12 shrink-0" />
          {!collapsed && (
            <span className="brandWordmark text-2xl font-semibold tracking-tight">
              Banalize
            </span>
          )}
        </div>
        {!collapsed && (
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Automated intrusion prevention
          </p>
        )}
      </div>
      <Separator />
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            data-testid={`nav-link-${to.slice(1)}`}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center",
                isActive
                  ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
