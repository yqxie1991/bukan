"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Home, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useSearch } from "@/components/providers/search-provider";

export function NavActions() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { open: openSearch } = useSearch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 归一判断 isDark：system 时按系统偏好（mounted 后读取），否则按显式值
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      mounted &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  // 统一基准样式：pill 形态 + chrome 红色 hover（与顶栏所有按钮一致）
  const btnClass =
    "group flex items-center space-x-2 px-3 md:px-4 py-2 bg-foreground/5 hover:bg-primary/10 rounded-full transition-all hover:scale-105 text-foreground text-xs md:text-sm font-medium shadow-lg backdrop-blur-sm";
  const iconClass = "w-5 h-5 text-foreground group-hover:text-primary";

  return (
    <Fragment>
      {/* 回到首页 */}
      <button
        onClick={() => router.push("/")}
        className={btnClass}
        title="回到首页"
        aria-label="回到首页"
      >
        <Home className={iconClass} />
      </button>

      {/* 搜索 */}
      <button
        onClick={openSearch}
        className={btnClass}
        title="搜索"
        aria-label="搜索"
      >
        <Search className={iconClass} />
      </button>

      {/* 主题切换（两态） */}
      {mounted ? (
        <button
          onClick={toggleTheme}
          className={btnClass}
          title={isDark ? "主题:深色" : "主题:浅色"}
          aria-label="切换主题"
        >
          {isDark ? (
            <Moon className={iconClass} />
          ) : (
            <Sun className={iconClass} />
          )}
        </button>
      ) : (
        <div className="h-9 w-10 rounded-full" aria-hidden />
      )}
    </Fragment>
  );
}
