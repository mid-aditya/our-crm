"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineDocumentReport,
  HiOutlineLightningBolt,
  HiOutlineUserGroup,
  HiOutlineX
} from "react-icons/hi";

import { ThemeToggle } from "./ThemeToggle";

const menuItems = [
  { name: "Contacts", href: "/contacts", icon: HiOutlineUserGroup },
  { name: "Deals", href: "/deals", icon: HiOutlineLightningBolt },
  { name: "Tasks", href: "/tasks", icon: HiOutlineClipboardList },
  { name: "Activities", href: "/activities", icon: HiOutlineChartBar },
  { name: "Reports", href: "/reports", icon: HiOutlineDocumentReport },
  { name: "Settings", href: "/settings", icon: HiOutlineCog },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border sticky top-0">
      <div className="flex h-20 items-center justify-between px-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
          Our CRM
        </h1>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 lg:hidden text-muted-foreground hover:text-foreground"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border mt-auto space-y-4">
        <ThemeToggle />
        <div className="flex items-center space-x-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">JD</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">Owner</p>
          </div>
        </div>
      </div>
    </div>
  );
}
