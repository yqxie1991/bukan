"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Home, Calendar, Film, Tv, Clock, Video, History, Sun, Moon, Monitor } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HistoryPopup } from "./HistoryPopup"; //  加上花括号就对了！
import { useTheme } from "@/components/providers/theme-provider";
import { useSearch } from "@/components/providers/search-provider";

interface NavChild { href: string; label: string; }
interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  mobileOnly?: boolean;
  children?: NavChild[];
}

interface NavbarProps {
  scrolled: boolean;
}

export function Navbar({ scrolled }: NavbarProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { open: openSearch } = useSearch();
  const [mounted, setMounted] = useState(false);

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

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
            </Link> {/*

            {/* 导航链接 - 桌面端 */}
            <div className="hidden md:flex items-center space-x-6">
              {navItems.filter(item => !item.mobileOnly).map((item) =>
                item.children ? (
                  <div
                    key={item.label}
                    className="relative group"
                    onMouseEnter={() => setOpenDropdown(item.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button className={`transition-colors text-base font-semibold flex items-center gap-1 py-2 ${
                      scrolled
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-white"
                    }`}>
                      {item.label}
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${
                          openDropdown === item.label ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {/* 下拉菜单 - 使用 pt-2 创建无缝hover区域 */}
                    {openDropdown === item.label && (
                      <div className="absolute top-full left-0 pt-1">
                        <div className="py-2 bg-card-bg rounded-lg shadow-2xl border border-border-color min-w-[140px] overflow-hidden">
                          {/* 顶部红色装饰线 - Netflix风格 */}
                          <div className="absolute top-1 left-0 right-0 h-0.5 bg-red-600" />
                          {item.children.map((child: NavChild) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-4 py-2.5 text-sm text-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href!}
                    target={item.external ? "_blank" : undefined}
                    className={`transition-colors text-base font-semibold ${
                      scrolled
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          </div>

          {/* 右侧功能区 */}
          <div className="flex items-center space-x-1 md:space-x-2">
            {/* 主题切换按钮 */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-colors flex items-center justify-center relative group ${
                  scrolled
                    ? "text-foreground hover:bg-foreground/5"
                    : "text-white hover:bg-white/10"
                }`}
                aria-label="切换主题"
                title={theme === "system" ? "主题: 自动" : theme === "light" ? "主题: 浅色" : "主题: 深色"}
              >
                {theme === "system" && <Monitor className="w-5 h-5 md:w-6 md:h-6" />}
                {theme === "light" && <Sun className="w-5 h-5 md:w-6 md:h-6" />}
                {theme === "dark" && <Moon className="w-5 h-5 md:w-6 md:h-6" />}
              </button>
            )}

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
      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 背景遮罩 */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* 侧边栏内容 */}
        <div
          className={`absolute top-0 left-0 h-full w-[280px] bg-background shadow-2xl border-r border-border-color transform transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ fontFamily: '"LXGW WenKai GB Screen", sans-serif' }}
        >
          {/* 侧边栏头部 */}
          <div className="p-6 border-b border-border-color">
            <div className="flex items-center gap-2">
              <h2 className="text-primary text-2xl font-bold tracking-tight" style={{ fontFamily: '"Smiley Sans", sans-serif' }}>
                不看
              </h2>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.children) {
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center space-x-3 px-4 py-3 text-muted-foreground">
                      <Icon className="w-5 h-5" />
                      <span className="text-lg font-semibold">
                        {item.label}
                      </span>
                    </div>
                    {item.children.map((child: NavChild) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 pl-12 rounded-lg text-muted-foreground hover:text-primary hover:bg-foreground/5 transition-all duration-200"
                      >
                        <span className="text-base font-semibold">
                          {child.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  target={item.external ? "_blank" : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-foreground/5 transition-all duration-200 group"
                >
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-lg font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* 侧边栏底部 */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border-color">
            <p className="text-xs text-muted-foreground text-center">
                         </p>
          </div>
        </div>
      </div>
    </>
  );
}
