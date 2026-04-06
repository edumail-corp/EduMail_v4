"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import {
  DashboardAvatar,
  DashboardIcon,
  dashboardInputClassName,
} from "@/components/dashboard/dashboard-chrome";
import { dashboardCurrentUser } from "@/lib/dashboard";

export function DashboardTopBar({
  label,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
}: Readonly<{
  label?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}>) {
  return (
    <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        {typeof searchValue === "string" ? (
          <label className="relative block w-full max-w-[620px]">
            <DashboardIcon
              name="search"
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchValue}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onSearchChange?.(event.target.value)
              }
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={`${dashboardInputClassName} pl-14 pr-5 text-[15px]`}
            />
          </label>
        ) : label ? (
          <div className="inline-flex rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-[0_12px_30px_rgba(142,155,182,0.12)]">
            {label}
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="flex items-center gap-3 self-end lg:self-auto">
        <Link
          href="/dashboard/activity"
          className="grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/78 text-slate-500 shadow-[0_14px_36px_rgba(140,153,179,0.16)] transition hover:bg-white hover:text-[#5C61FF]"
          aria-label="Open activity log"
        >
          <DashboardIcon name="notification" />
        </Link>
        <Link
          href="/dashboard/settings"
          className="grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/78 text-slate-500 shadow-[0_14px_36px_rgba(140,153,179,0.16)] transition hover:bg-white hover:text-[#5C61FF]"
          aria-label="Open settings"
        >
          <DashboardIcon name="settings" />
        </Link>
        <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/78 px-3 py-2 shadow-[0_14px_36px_rgba(140,153,179,0.16)]">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">
              {dashboardCurrentUser.name}
            </p>
            <p className="text-xs font-medium text-slate-500">
              {dashboardCurrentUser.role}
            </p>
          </div>
          <DashboardAvatar
            name={dashboardCurrentUser.name}
            className="h-10 w-10 text-[10px]"
          />
        </div>
      </div>
    </div>
  );
}
