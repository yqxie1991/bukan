"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

interface ThemeToggleProps {
  /**
   * 与同一行的搜索 / 历史按钮保持一致所必需：
   * 导航栏未滚动时浮在深色 Hero 图上，图标必须用白色。
   */
  scrolled?: boolean;
}

/**
 * 三态主题切换按钮
 * 循环切换：system → light → dark → system
 *
 * ⚠️ 样式必须与相邻的搜索按钮、历史按钮完全一致：
 *   p-2 rounded-full、图标 w-5 h-5 md:w-6 md:h-6、
 *   且随 scrolled 在 text-white / text-foreground 之间切换。
 * 此前用的是 px-3 py-2 rounded-lg + 图标 w-4 h-4 + 写死的 text-muted-foreground，
 * 导致未滚动时本按钮比邻居明显偏暗、形状也不一致。
 */
export function ThemeToggle({ scrolled = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 水合安全的挂载检测：首屏必须渲染成与 SSR 一致的形态，挂载后再切换。
    // 改成渲染期判断会造成 hydration mismatch。
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const iconClass = "w-5 h-5 md:w-6 md:h-6";
    if (!mounted) return <Monitor className={iconClass} />;
    if (theme === "light") return <Sun className={iconClass} />;
    if (theme === "dark") return <Moon className={iconClass} />;
    return <Monitor className={iconClass} />;
  };

  const getThemeLabel = () => {
    if (!mounted) return "系统";
    if (theme === "light") return "浅色";
    if (theme === "dark") return "深色";
    return "系统";
  };

  const label = getThemeLabel();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full transition-colors ${
        scrolled
          ? "text-foreground hover:bg-foreground/5"
          : "text-white hover:bg-white/10"
      }`}
      aria-label={`切换主题（当前：${label}）`}
      title={`当前：${label}模式`}
    >
      {getThemeIcon()}
    </button>
  );
}
