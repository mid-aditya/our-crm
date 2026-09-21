"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useSyncExternalStore } from "react";
import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Hydration guard tanpa setState di effect
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="h-7 w-full rounded-md bg-white/5 animate-pulse" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex w-full items-center justify-between rounded-md bg-white/5 px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-white/10 hover:text-ink-foreground"
    >
      {isDark ? "Dark mode" : "Light mode"}
      {isDark ? (
        <HiOutlineMoon className="h-4 w-4" />
      ) : (
        <HiOutlineSun className="h-4 w-4" />
      )}
    </button>
  );
}
