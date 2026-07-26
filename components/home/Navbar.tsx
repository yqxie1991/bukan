"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Home, Calendar, Film, Tv, Clock, Video, History } from "lucide-react";
import { HistoryPopup } from "./HistoryPopup";
import { useSearch } from "@/components/providers/search-provider";
import { ThemeToggle } from "./ThemeToggle";
import { DesktopNav } from "./DesktopNav";
import { MobileSidebar, type NavItem } from "./MobileSidebar";

interface NavbarProps {
  scrolled: boolean;
}

export function Navbar({ scrolled }: NavbarProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { open: openSearch } = useSearch();

  // 防止移动端菜单打开时页面滚动
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const navItems: NavItem[] = [
    { href: "/", label: "首页", icon: Home },
    { href: "/browse/movies", label: "电影", icon: Film },
    { href: "/browse/tv", label: "电视剧", icon: Tv },
    { href: "/calendar", label: "追剧日历", icon: Calendar },
    { href: "/browse/latest", label: "最新", icon: Clock },
    { href: "/history", label: "历史记录", icon: History, mobileOnly: true },
    {
      label: "短剧",
      icon: Video,
      children: [
        { href: "/shorts", label: "短剧" },
        { href: "/dailymotion", label: "短剧Motion" },
      ],
    },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 border-b border-border-color/50 shadow-sm dark:shadow-none"
            : "bg-gradient-to-b from-black/50 to-transparent"
        }`}
        style={{ fontFamily: '"LXGW WenKai GB Screen", sans-serif' }}
      >
        <div className="px-4 md:px-12 py-3 md:py-4 flex items-center justify-between">
          {/* 左侧：汉堡菜单（移动端）+ Logo */}
          <div className="flex items-center space-x-2 md:space-x-8">
            {/* 汉堡菜单按钮 - 仅移动端 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-foreground/5 rounded-lg transition-colors"
              aria-label="菜单"
            >
              {isMobileMenuOpen ? (
                <X className={`w-6 h-6 ${scrolled ? "text-foreground" : "text-white"}`} />
              ) : (
                <Menu className={`w-6 h-6 ${scrolled ? "text-foreground" : "text-white"}`} />
              )}
            </button>

            {/* Logo */}
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-1"
            >
              <h1
                onClick={() => {
                  router.push("/");
                  setIsMobileMenuOpen(false);
                }}
                className="text-primary text-xl md:text-2xl lg:text-3xl font-bold tracking-tight cursor-pointer transition-colors"
                style={{ fontFamily: '"Smiley Sans", sans-serif' }}
              >
                不看
              </h1>
            </Link>

            {/* 导航链接 - 桌面端 */}
            <DesktopNav navItems={navItems} scrolled={scrolled} />
          </div>

          {/* 右侧功能区 */}
          <div className="flex items-center space-x-1 md:space-x-2">
            {/* 主题切换按钮 */}
            <ThemeToggle />

            {/* 搜索按钮 */}
            <button
              onClick={openSearch}
              className={`p-2 rounded-full transition-colors ${
                scrolled
                  ? "text-foreground hover:bg-foreground/5"
                  : "text-white hover:bg-white/10"
              }`}
              aria-label="搜索"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* 历史记录弹出 */}
            <HistoryPopup scrolled={scrolled} />
          </div>
        </div>
      </nav>

      {/* 移动端侧边栏菜单 */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
      />
    </>
  );
}
