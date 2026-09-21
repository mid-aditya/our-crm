"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineDocumentReport,
  HiOutlineLightningBolt,
  HiOutlineUserGroup,
  HiOutlineX,
  HiOutlineLogout,
} from "react-icons/hi";
import { ThemeToggle } from "./ThemeToggle";

const menuItems = [
  { name: "Contacts", href: "/contacts", icon: HiOutlineUserGroup },
  { name: "Deals", href: "/deals", icon: HiOutlineLightningBolt },
  { name: "Tasks", href: "/tasks", icon: HiOutlineClipboardList },
  { name: "Reports", href: "/reports", icon: HiOutlineDocumentReport },
  { name: "Settings", href: "/settings", icon: HiOutlineCog },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "U");

  return (
    <div className="flex h-screen w-56 flex-col bg-ink text-ink-foreground border-r border-ink/60 sticky top-0">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/5 px-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary font-display text-[13px] font-bold text-primary-foreground">
          O
        </span>
        <span className="font-display text-[15px] font-bold tracking-tight">
          Our CRM
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto p-1 lg:hidden text-ink-muted hover:text-ink-foreground"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <p className="microlabel px-2 pb-2 text-ink-muted">Workspace</p>
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-ink-foreground"
                      : "text-ink-muted hover:bg-white/5 hover:text-ink-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      isActive ? "bg-primary" : "bg-white/20 group-hover:bg-white/40",
                    )}
                  />
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="space-y-3 border-t border-white/5 p-3">
        <ThemeToggle />

        <div className="flex items-center gap-2.5 rounded-md bg-white/5 p-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/25">
            <span className="num text-[10px] font-semibold text-primary">
              {initials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight">
              {profile?.full_name || user?.email?.split("@")[0] || "User"}
            </p>
            <p className="microlabel pt-0.5 text-ink-muted">
              {profile?.role || "Member"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <HiOutlineLogout className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
