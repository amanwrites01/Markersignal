"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={showLabel ? "default" : "icon"}
        className={cn(
          "size-9 rounded-full text-ink-muted hover:text-forest",
          showLabel && "w-auto px-3 justify-start gap-2",
          className,
        )}
        aria-label="Toggle theme"
      >
        <Sun className="size-4 opacity-0" />
        {showLabel ? <span>Theme</span> : null}
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative rounded-full text-ink-muted transition-colors hover:bg-forest/10 hover:text-forest dark:text-ink-muted dark:hover:bg-white/10 dark:hover:text-ivory",
        showLabel ? "w-auto px-3.5 h-10 justify-start gap-2.5 font-medium" : "size-9",
        className,
      )}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
      title={isDark ? "Switch to day mode" : "Switch to night mode"}
    >
      <div className="relative size-4 shrink-0">
        <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute inset-0 size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-lime" />
      </div>
      {showLabel ? (
        <span>{isDark ? "Day mode" : "Night mode"}</span>
      ) : (
        <span className="sr-only">Toggle day/night theme</span>
      )}
    </Button>
  );
}
