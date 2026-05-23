"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-full rounded-lg bg-secondary/50 animate-pulse" />
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-1 w-full">
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          theme === "light"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <HiOutlineSun className="mr-2 h-4 w-4" />
        Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          theme === "dark"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <HiOutlineMoon className="mr-2 h-4 w-4" />
        Dark
      </button>
    </div>
  );
}
