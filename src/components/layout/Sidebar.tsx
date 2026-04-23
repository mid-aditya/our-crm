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
        "flex flex-col h-screen bg-card border-r border-border transition-[width] duration-200 ease-out sticky top-0 flex-shrink-0 z-40 group/sidebar will-change-[width] overflow-hidden",
        sidebarCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={cn(
            "rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 transition-all duration-200",
            sidebarCollapsed ? "w-10 h-10" : "w-9 h-9"
          )}>
            <CircleDot className={cn("text-primary-foreground transition-all", sidebarCollapsed ? "w-6 h-6" : "w-5 h-5")} />
          </div>
          <span className={cn(
            "font-bold text-sm tracking-tight text-foreground whitespace-nowrap transition-all duration-200",
            sidebarCollapsed ? "opacity-0 translate-x-4 pointer-events-none" : "opacity-100 translate-x-0"
          )}>
            BroadcastCRM
          </span>
        </div>
        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors z-50 opacity-0 group-hover/sidebar:opacity-100 shadow-md"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
        <p className={cn(
          "text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] px-3 mb-3 transition-opacity duration-200",
          sidebarCollapsed ? "opacity-0 h-0 mb-0" : "opacity-100"
        )}>
          Menu Utama
        </p>
        
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                "w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 relative group outline-none",
                sidebarCollapsed ? "justify-center p-3.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 transition-all duration-200",
                  sidebarCollapsed ? "w-6 h-6" : "w-[18px] h-[18px]",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className={cn(
                "flex-1 text-left text-[14px] font-medium whitespace-nowrap transition-all duration-200",
                sidebarCollapsed ? "opacity-0 w-0 pointer-events-none translate-x-4" : "opacity-100 w-auto translate-x-0"
              )}>
                {item.label}
              </span>
              
              {item.badge && (
                <span className={cn(
                  "bg-primary text-primary-foreground font-bold rounded-full text-center leading-none transition-all duration-200",
                  sidebarCollapsed 
                    ? "absolute top-2 right-2 w-2.5 h-2.5 border-2 border-card" 
                    : "text-[10px] px-2 py-0.5 min-w-[20px] opacity-100"
                )}>
                  {!sidebarCollapsed && item.badge}
                </span>
              )}
              
              {/* Tooltip for collapsed state */}
              {sidebarCollapsed && (
                <div className="fixed left-[80px] px-3 py-2 bg-card border border-border rounded-lg text-foreground text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 pointer-events-none z-[100] shadow-xl flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="bg-primary text-primary-foreground text-[9px] font-bold rounded-full px-1.5 py-0.5">
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
      <div className={cn("mt-auto border-t border-border p-4 flex-shrink-0 transition-all", sidebarCollapsed ? "px-3" : "px-4")}>
        <p className={cn(
          "text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-4 transition-all duration-200",
          sidebarCollapsed ? "opacity-0 h-0 mb-0" : "opacity-100"
        )}>
          Status Platform
        </p>
        <div className={cn("space-y-3", sidebarCollapsed && "flex flex-col items-center gap-5 space-y-0 mb-4")}>
          {platformStatus.map((p) => (
            <div key={p.name} className={cn("flex items-center gap-3", sidebarCollapsed && "relative group justify-center")}>
              <div
                className={cn(
                  "rounded-full flex-shrink-0 relative transition-all duration-200",
                  sidebarCollapsed ? "w-3 h-3" : "w-2 h-2",
                  p.online ? "after:absolute after:inset-0 after:rounded-full after:animate-ping after:bg-current after:opacity-40" : "opacity-30"
                )}
                style={{ backgroundColor: p.online ? p.color : "var(--muted-foreground)", color: p.color }}
              />
              
              <span className={cn(
                "text-[13px] font-medium flex-1 whitespace-nowrap transition-all duration-200",
                sidebarCollapsed ? "opacity-0 w-0 pointer-events-none translate-x-4" : "opacity-100 w-auto translate-x-0",
                p.online ? "text-foreground" : "text-muted-foreground"
              )}>
                {p.name}
              </span>
              
              {!sidebarCollapsed && (
                <span
                  className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-secondary/50"
                  style={{ color: p.online ? p.color : "var(--muted-foreground)" }}
                >
                  {p.online ? "LIVE" : "OFFLINE"}
                </span>
              )}

              {sidebarCollapsed && (
                <div className="fixed left-[80px] px-3 py-2 bg-card border border-border rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 pointer-events-none z-[100] shadow-xl flex items-center gap-2">
                  <span style={{ color: p.color }}>{p.name}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className={p.online ? "text-success" : "text-muted-foreground"}>
                    {p.online ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div className={cn(
          "mt-6 flex items-center gap-3 p-2 rounded-xl transition-all duration-200",
          sidebarCollapsed ? "bg-transparent border-none p-0 justify-center" : "bg-secondary/30 border border-border/50"
        )}>
          <div className={cn(
            "rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center flex-shrink-0 shadow-lg cursor-pointer transition-all duration-200",
            sidebarCollapsed ? "w-10 h-10" : "w-9 h-9"
          )}>
            <span className={cn("font-extrabold text-primary-foreground", sidebarCollapsed ? "text-[14px]" : "text-[12px]")}>AD</span>
          </div>
          <div className={cn(
            "flex-1 overflow-hidden transition-all duration-200",
            sidebarCollapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-auto"
          )}>
            <p className="text-[13px] font-bold text-foreground leading-tight truncate">Aditya Admin</p>
            <p className="text-[11px] text-muted-foreground truncate">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
