"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardAvatar,
  DashboardIcon,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";
import { dashboardCurrentUser, dashboardNavItems } from "@/lib/dashboard";

export function DashboardShell({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const isComposePage = pathname === "/dashboard/compose";
  const { preferences } = useUserPreferences();
  const composeLabel = preferences.language === "Polish"
    ? "Nowa wiadomość"
      : "Compose New";
  const assistantLabel =
    preferences.language === "Polish" ? "Asystent AI" : "AI Assistant";
  const workspaceDescription =
    preferences.language === "Polish"
      ? "Przeglądaj uczelnianą korespondencję, zarządzaj źródłami zasad i utrzymuj przepływ prototypu w jednym miejscu."
      : "Review university communications, manage policy sources, and keep the prototype workflow moving in one place.";
  const roleLabel =
    preferences.language === "Polish"
      ? "Właściciel prototypu"
      : dashboardCurrentUser.role;
  const navLabelOverrides: Record<string, { label: string; shortLabel: string }> =
    preferences.language === "Polish"
        ? {
            Dashboard: { label: "Panel", shortLabel: "Start" },
            Inbox: { label: "Skrzynka", shortLabel: "Wszystko" },
            "Knowledge Base": { label: "Baza wiedzy", shortLabel: "Dok." },
            Admin: { label: "Admin", shortLabel: "Ster." },
            Settings: { label: "Ustawienia", shortLabel: "Opcje" },
          }
        : {};

  return (
    <div className="dashboard-shell min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(120,129,255,0.22),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(179,221,255,0.35),_transparent_28%),linear-gradient(180deg,#eef2fb_0%,#f5f7fd_44%,#f7f8fd_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1720px] flex-col gap-4 px-3 py-3 lg:flex-row lg:px-5 lg:py-5">
        <aside className="w-full shrink-0 lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-[292px]">
          <div
            className={`${dashboardPanelClassName} flex h-full min-h-0 flex-col overflow-hidden px-5 py-5 sm:px-6 sm:py-6`}
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-[22px] bg-gradient-to-br from-[#5C61FF] via-[#6C79FF] to-[#90D9FF] text-white shadow-[0_20px_44px_rgba(108,121,255,0.28)]">
                    <DashboardIcon name="knowledge" className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {assistantLabel}
                    </p>
                    <h1 className="mt-1 text-[1.8rem] font-semibold tracking-tight text-[#4F57E8]">
                      EduMailAI
                    </h1>
                  </div>
                </div>

                <p className="max-w-xs text-sm leading-6 text-slate-500">
                  {workspaceDescription}
                </p>

                <Link
                  href="/dashboard/compose"
                  aria-current={isComposePage ? "page" : undefined}
                  className={`${dashboardPrimaryButtonClassName} mt-5 w-full gap-3 ${
                    isComposePage
                      ? "ring-2 ring-[#C7CEFF] ring-offset-2 ring-offset-transparent"
                      : ""
                  }`}
                >
                  <DashboardIcon name="compose" className="h-[18px] w-[18px]" />
                  {composeLabel}
                </Link>
              </div>

              <nav className="space-y-1.5">
                {dashboardNavItems.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`group flex items-center justify-between rounded-[22px] px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-white text-[#4F57E8] shadow-[0_18px_44px_rgba(150,163,191,0.2)]"
                          : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3.5">
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
                            isActive
                              ? "bg-[#EEF0FF] text-[#5C61FF]"
                              : "bg-white/60 text-slate-400 group-hover:bg-white group-hover:text-[#5C61FF]"
                          }`}
                        >
                          <DashboardIcon name={item.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="truncate">
                          {navLabelOverrides[item.label]?.label ?? item.label}
                        </span>
                      </span>
                      <span
                        className={`ml-3 shrink-0 text-[10px] uppercase tracking-[0.22em] ${
                          isActive ? "text-[#8D95C2]" : "text-slate-300"
                        }`}
                      >
                        {navLabelOverrides[item.label]?.shortLabel ?? item.shortLabel}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className={`${dashboardPanelClassName} mt-4 shrink-0 p-3`}>
              <div className="flex items-center gap-3">
                <DashboardAvatar
                  name={dashboardCurrentUser.name}
                  className="h-12 w-12 text-[10px]"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {dashboardCurrentUser.name}
                  </p>
                  <p className="truncate text-xs font-medium text-slate-500">
                    {roleLabel}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {dashboardCurrentUser.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="dashboard-main-surface min-h-full rounded-[36px] border border-white/55 bg-white/22 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] sm:px-5 sm:py-5 lg:min-h-[calc(100vh-2.5rem)] lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
