"use client";

import { useApp } from "@/context/AppContext";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Inbox,
  LayoutDashboard,
  MessageSquareWarning,
  Megaphone,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Page =
  | "dashboard"
  | "campaigns"
  | "broadcast"
  | "inbox"
  | "complaints"
  | "contacts"
  | "analytics"
  | "settings";

const navItems: {
  id: Page;
  label: string;
  icon: React.ElementType;
  badge?: number;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "broadcast", label: "Broadcast", icon: Zap },
  { id: "inbox", label: "Inbox", icon: Inbox, badge: 8 },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning, badge: 3 },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const platformStatus = [
  { name: "WhatsApp", color: "#25D366", online: true },
  { name: "RCS", color: "#00F5FF", online: true },
  { name: "Email", color: "#D29922", online: true },
  { name: "SMS", color: "#9966FF", online: false },
];

export function Sidebar() {
  const { currentPage, navigate, sidebarCollapsed, setSidebarCollapsed } = useApp();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#161B22] border-r border-[#30363D] transition-all duration-300 sticky top-0 flex-shrink-0 z-40 relative group/sidebar",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#30363D] flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded bg-[#00F5FF] flex items-center justify-center flex-shrink-0">
              <CircleDot className="w-4 h-4 text-[#0D1117]" />
            </div>
            <span className="font-['Space_Mono'] font-bold text-sm text-[#00F5FF] whitespace-nowrap glow-cyan-sm mt-0.5">
              BroadcastCRM
            </span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded bg-[#00F5FF] flex items-center justify-center mx-auto flex-shrink-0">
            <CircleDot className="w-5 h-5 text-[#0D1117]" />
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "p-1.5 rounded-lg text-[#8B949E] hover:text-[#00F5FF] hover:bg-[#21262D] transition-colors",
            sidebarCollapsed && "hidden"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute -right-3 top-20 w-6 h-6 bg-[#21262D] border border-[#30363D] rounded-full flex items-center justify-center text-[#8B949E] hover:text-[#00F5FF] transition-colors z-50 opacity-0 group-hover/sidebar:opacity-100 shadow-md"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {!sidebarCollapsed && (
          <p className="text-[10px] font-mono text-[#484F58] uppercase tracking-widest px-2 mb-2">
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 relative group outline-none",
                sidebarCollapsed ? "justify-center p-2.5 mx-auto max-w-[40px]" : "gap-3 px-3 py-2.5",
                isActive
                  ? "nav-active text-[#00F5FF]"
                  : "text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-[#00F5FF]" : "text-[#8B949E] group-hover:text-[#E6EDF3]",
                  sidebarCollapsed && "w-[18px] h-[18px]"
                )}
              />
              {!sidebarCollapsed && (
                <span className="flex-1 text-left font-['IBM_Plex_Sans'] text-[13px]">
                  {item.label}
                </span>
              )}
              {item.badge && !sidebarCollapsed && (
                <span className="bg-[#00F5FF] text-[#0D1117] text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {item.badge}
                </span>
              )}
              {item.badge && sidebarCollapsed && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF4C4C] rounded-full border-2 border-[#161B22]" />
              )}
              
              {/* Floating Tooltip for collapsed state */}
              {sidebarCollapsed && (
                <div className="fixed left-16 ml-3 px-2.5 py-1.5 bg-[#21262D] border border-[#30363D] rounded-md text-[#E6EDF3] text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] shadow-lg flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="bg-[#00F5FF] text-[#0D1117] text-[9px] font-bold rounded-full px-1.5 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Platform Status */}
      <div className={cn("border-t border-[#30363D] p-4 flex-shrink-0", sidebarCollapsed && "px-2")}>
        {!sidebarCollapsed && (
          <p className="text-[10px] font-mono text-[#484F58] uppercase tracking-widest mb-3">
            Platforms
          </p>
        )}
        <div className={cn("space-y-2", sidebarCollapsed && "flex flex-col items-center gap-3 space-y-0 mb-2")}>
          {platformStatus.map((p) => (
            <div key={p.name} className={cn("flex items-center gap-2.5", sidebarCollapsed && "relative group justify-center")}>
              <div
                className={cn(
                  "rounded-full flex-shrink-0 transition-opacity",
                  sidebarCollapsed ? "w-2.5 h-2.5" : "w-1.5 h-1.5",
                  p.online ? "pulse-online" : "opacity-30"
                )}
                style={{ backgroundColor: p.online ? p.color : "#8B949E" }}
              />
              
              {!sidebarCollapsed && (
                <>
                  <span className={cn("text-[11px] font-['IBM_Plex_Sans'] flex-1", p.online ? "text-[#E6EDF3]" : "text-[#8B949E]")}>
                    {p.name}
                  </span>
                  <span
                    className="text-[9px] font-mono font-bold tracking-wider"
                    style={{ color: p.online ? p.color : "#8B949E" }}
                  >
                    {p.online ? "ONLINE" : "OFFLINE"}
                  </span>
                </>
              )}

              {/* Tooltip for Platform dots when minified */}
              {sidebarCollapsed && (
                <div className="fixed left-16 ml-3 px-2 py-1 bg-[#21262D] border border-[#30363D] rounded-md text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] shadow-lg flex items-center gap-1.5">
                  <span style={{ color: p.color }}>{p.name}</span>
                  <span className="text-[#8B949E] mx-1">•</span>
                  <span className={p.online ? "text-[#3FB950]" : "text-[#8B949E]"}>
                    {p.online ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div className={cn("mt-4 flex items-center gap-3", sidebarCollapsed && "justify-center pt-2 border-t border-[#30363D]")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#0099CC] flex items-center justify-center flex-shrink-0 shadow-lg cursor-pointer">
            <span className="text-[11px] font-bold text-[#0D1117] tracking-tighter">AD</span>
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-[12px] font-semibold text-[#E6EDF3] leading-tight truncate">Aditya Admin</p>
              <p className="text-[10px] text-[#8B949E] truncate">Super Admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
