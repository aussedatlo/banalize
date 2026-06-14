import logoIcon from "@/assets/logo-icon.png";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bell,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  UserX,
} from "lucide-react";
import { NavLink } from "react-router-dom";

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
        <div className="flex items-center gap-1.5">
          <img src={logoIcon} alt="" className="h-8 w-auto" />
          <span className="pageTitle text-xl font-bold">Banalize</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Automated intrusion prevention
        </p>
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
                  ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-sm"
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
