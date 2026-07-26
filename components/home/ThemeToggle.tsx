"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

/**
 * 三态主题切换按钮
 * 循环切换：system → light → dark → system
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  const getThemeIcon = () => {
    if (!mounted) return <Monitor className="w-4 h-4" />;
    if (theme === "light") return <Sun className="w-4 h-4" />;
    if (theme === "dark") return <Moon className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const getThemeLabel = () => {
    if (!mounted) return "系统";
    if (theme === "light") return "浅色";
    if (theme === "dark") return "深色";
    return "系统";
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-foreground/10 transition-colors text-muted-foreground hover:text-foreground"
      title={`当前：${getThemeLabel()}模式`}
    >
      {getThemeIcon()}
    </button>
  );
}
