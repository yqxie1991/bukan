"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavItem, NavChild } from "./MobileSidebar";

interface DesktopNavProps {
  navItems: NavItem[];
  scrolled: boolean;
}

export function DesktopNav({ navItems, scrolled }: DesktopNavProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div className="hidden md:flex items-center space-x-6">
      {navItems
        .filter((item) => !item.mobileOnly)
        .map((item) =>
          item.children ? (
            <div
              key={item.label}
              className="relative group"
              onMouseEnter={() => setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`transition-colors text-base font-semibold flex items-center gap-1 py-2 ${
                  scrolled
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-white"
                }`}
              >
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
              {/* 下拉菜单 - 玻璃拟物风格 */}
              {openDropdown === item.label && (
                <div className="absolute top-full left-0 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="py-2 bg-card-bg/80 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5 min-w-[140px] overflow-hidden">
                    {/* 顶部红色装饰线 */}
                    <div className="absolute top-1 left-0 right-0 h-[2px] bg-primary opacity-80" />
                    {item.children.map((child: NavChild) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-foreground hover:text-primary hover:bg-primary/10 hover:pl-5 transition-all duration-300"
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
  );
}
