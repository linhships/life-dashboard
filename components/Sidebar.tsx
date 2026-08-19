"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronUp,
  Landmark,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

interface SubItem {
  id: string;
  label: string;
}

const FINANCE_ITEMS: SubItem[] = [
  { id: "overview", label: "Overview" },
  { id: "net-worth", label: "Net Worth" },
  { id: "coast-fire", label: "Coast FIRE & Drawdown" },
  { id: "cash-flow", label: "Cash Flow" },
  { id: "pension", label: "Pension Allowance" },
  { id: "kids", label: "Kids' Accounts" },
];

const COLLAPSE_KEY = "life-dashboard-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(true);
  const [activeId, setActiveId] = useState<string>("overview");
  const onHome = pathname === "/";

  // Restore collapse preference (real app preference, not an in-conversation
  // artifact, so localStorage is fine here).
  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  // Highlight whichever section is currently near the top of the viewport.
  // Only relevant on the home page — other routes don't have these anchors.
  useEffect(() => {
    if (!onHome) return;
    const elements = FINANCE_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topMost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveId(topMost.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onHome]);

  const handleNavClick = (id: string) => {
    setMobileOpen(false);
    if (onHome) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`/#${id}`);
    }
  };

  const isAnyChildActive = onHome && FINANCE_ITEMS.some((item) => item.id === activeId);
  const onNews = pathname?.startsWith("/news") ?? false;

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            £
          </div>
          <span className="text-sm font-semibold text-slate-900">Life Dashboard</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:transition-[width] ${
          collapsed ? "md:w-20" : "md:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className={`flex items-center gap-2 border-b border-slate-200 px-5 py-5 ${
            collapsed ? "md:justify-center md:px-0" : ""
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
            £
          </div>
          <span
            className={`text-sm font-semibold text-slate-900 ${collapsed ? "md:hidden" : ""}`}
          >
            Life Dashboard
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p
            className={`mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            Menu
          </p>

          {/* News */}
          <Link
            href="/news"
            onClick={() => setMobileOpen(false)}
            title={collapsed ? "Daily Briefing" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              onNews
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            } ${collapsed ? "md:justify-center" : ""}`}
          >
            <Newspaper className="h-[18px] w-[18px] shrink-0" />
            <span className={`flex-1 truncate text-left ${collapsed ? "md:hidden" : ""}`}>
              Daily Briefing
            </span>
          </Link>

          {/* Parent: Finance */}
          <button
            type="button"
            onClick={() => setFinanceOpen((o) => !o)}
            title={collapsed ? "Finance" : undefined}
            className={`mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              isAnyChildActive
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            } ${collapsed ? "md:justify-center" : ""}`}
          >
            <Landmark className="h-[18px] w-[18px] shrink-0" />
            <span className={`flex-1 truncate text-left ${collapsed ? "md:hidden" : ""}`}>
              Finance
            </span>
            <ChevronUp
              className={`h-4 w-4 shrink-0 transition-transform ${
                financeOpen ? "" : "rotate-180"
              } ${collapsed ? "md:hidden" : ""}`}
            />
          </button>

          {/* Sub-items */}
          {financeOpen && (
            <ul
              className={`mt-1 space-y-1 border-l border-slate-200 pl-4 ${
                collapsed ? "md:hidden" : ""
              }`}
            >
              {FINANCE_ITEMS.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`hidden w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 md:flex ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
