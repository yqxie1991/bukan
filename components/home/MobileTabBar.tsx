"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, Search } from "lucide-react";
import { useSearch } from "@/components/providers/search-provider";

// 在以下路由前缀下隐藏底部 Tab Bar
const HIDDEN_PREFIXES = ["/play", "/shorts", "/dailymotion", "/admin", "/calendar", "/login"];

export function MobileTabBar() {
  const pathname = usePathname();
  const { open: openSearch } = useSearch();

  // 次级全屏页不显示底部导航
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const tabs = [
    { href: "/", label: "首页", icon: Home, exact: true },
    { href: "/browse/movies", label: "电影", icon: Film, exact: false },
    { href: "/browse/tv", label: "电视剧", icon: Tv, exact: false },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border-color bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="移动端底部导航"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-1 py-2 flex-1 transition-colors active:scale-95 active:bg-foreground/5 ${
              isActive(href, exact)
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        {/* 搜索 Tab - 触发全局搜索弹窗 */}
        <button
          onClick={openSearch}
          className="flex flex-col items-center justify-center gap-1 py-2 flex-1 text-muted-foreground transition-colors active:scale-95 active:bg-foreground/5"
          aria-label="搜索"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium">搜索</span>
        </button>
      </div>
    </nav>
  );
}
