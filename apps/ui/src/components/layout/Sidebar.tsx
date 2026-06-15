import SidebarNav from "@/components/layout/SidebarNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/** Desktop navigation rail. Hidden on mobile (see MobileNav). */
export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <div
      className={cn(
        "relative hidden flex-col border-r bg-card transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-5 z-10 h-6 w-6 rounded-full border bg-background shadow-sm"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" />
        )}
      </Button>
      <SidebarNav collapsed={collapsed} />
    </div>
  );
}
