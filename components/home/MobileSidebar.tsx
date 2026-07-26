"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface NavChild {
  href: string;
  label: string;
}

export interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  mobileOnly?: boolean;
  children?: NavChild[];
}

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

export function MobileSidebar({ isOpen, onClose, navItems }: MobileSidebarProps) {
  return (
    <div
      className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 侧边栏内容 */}
      <div
        className={`absolute top-0 left-0 h-full w-[280px] bg-background shadow-2xl border-r border-border-color transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ fontFamily: '"LXGW WenKai GB Screen", sans-serif' }}
      >
        {/* 侧边栏头部 */}
        <div className="p-6 border-b border-border-color">
          <div className="flex items-center gap-2">
            <h2
              className="text-primary text-2xl font-bold tracking-tight"
              style={{ fontFamily: '"Smiley Sans", sans-serif' }}
            >
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
                    <span className="text-lg font-semibold">{item.label}</span>
                  </div>
                  {item.children.map((child: NavChild) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className="flex items-center space-x-3 px-4 py-2 pl-12 rounded-lg text-muted-foreground hover:text-primary hover:bg-foreground/5 transition-all duration-200"
                    >
                      <span className="text-base font-semibold">{child.label}</span>
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
                onClick={onClose}
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
          <p className="text-xs text-muted-foreground text-center"></p>
        </div>
      </div>
    </div>
  );
}
