"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import {
  DashboardIcon,
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
  activityActionMeta,
  activityFilters,
  formatActivityTimestamp,
  getActivityFilterLabel,
  isActivityFilter,
  type ActivityEvent,
  type ActivityFilter,
} from "@/lib/activity-log";
import {
  assessEmailGrounding,
  getEmailDepartment,
  type StaffEmail,
} from "@/lib/email-data";

function matchesActivitySearch(event: ActivityEvent, query: string) {
  if (query.length === 0) {
    return true;
  }

  const searchableText = [
    event.title,
    event.description,
    event.entityType,
    activityActionMeta[event.action].label,
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

function getActivityCounts(events: ActivityEvent[]) {
  return activityFilters.reduce<Record<ActivityFilter, number>>(
    (counts, filter) => {
      counts[filter] =
        filter === "All"
          ? events.length
          : events.filter((event) => event.action === filter).length;

      return counts;
    },
    {
      All: 0,
      case_created: 0,
      email_approved: 0,
      assignment_updated: 0,
      draft_saved: 0,
      note_saved: 0,
      document_uploaded: 0,
      document_deleted: 0,
    }
  );
}

function getEventSourceLabel(event: ActivityEvent) {
  return event.entityType === "document" ? "Knowledge Base" : "EduMailAI";
}

function getLastSevenSnapshots(anchorIso: string) {
  const anchor = new Date(anchorIso);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - (6 - index));

    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
    };
  });
}

export function ActivityLogView({
  events,
  emails,
}: Readonly<{
  events: ActivityEvent[];
  emails: StaffEmail[];
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const requestedActionParam = searchParams.get("action");
  const activeFilter: ActivityFilter =
    requestedActionParam && isActivityFilter(requestedActionParam)
      ? requestedActionParam
      : "All";
  const counts = getActivityCounts(events);
  const filteredEvents =
    activeFilter === "All"
      ? events
      : events.filter((event) => event.action === activeFilter);
  const visibleEvents = filteredEvents.filter((event) =>
    matchesActivitySearch(event, normalizedSearchQuery)
  );
  const latestTimestamp = events[0]?.timestamp ?? new Date().toISOString();
  const weeklySnapshots = getLastSevenSnapshots(latestTimestamp);
  const weeklySeries = weeklySnapshots.map((snapshot) => ({
    ...snapshot,
    count: events.filter((event) => event.timestamp.slice(0, 10) === snapshot.key).length,
  }));
  const maxWeeklyValue = weeklySeries.reduce(
    (max, entry) => (entry.count > max ? entry.count : max),
    1
  );
  const approvalRate =
    counts.All === 0 ? 0 : Math.round((counts.email_approved / counts.All) * 100);
  const documentChangeRate =
    counts.All === 0
      ? 0
      : Math.round(
          ((counts.document_uploaded + counts.document_deleted) / counts.All) * 100
        );
  const emailsWithGrounding = emails.map((email) => ({
    email,
    grounding: assessEmailGrounding(email),
  }));
  const approvalReadyCount = emailsWithGrounding.filter(
    ({ grounding }) => grounding.approvalReady
  ).length;
  const weakGroundingCount = emailsWithGrounding.filter(
    ({ grounding }) => grounding.strength === "Weak"
  ).length;
  const unassignedQueueCount = emails.filter((email) => email.assignee === null).length;
  const escalatedQueueCount = emails.filter(
    (email) => email.status === "Escalated"
  ).length;
  const approvalReadinessRate =
    emails.length === 0 ? 0 : Math.round((approvalReadyCount / emails.length) * 100);
  const weakGroundingRate =
    emails.length === 0 ? 0 : Math.round((weakGroundingCount / emails.length) * 100);
  const riskByDepartment = Object.entries(
    emailsWithGrounding.reduce<Record<string, { weak: number; total: number }>>(
      (totals, { email, grounding }) => {
        const department = getEmailDepartment(email);
        const current = totals[department] ?? { weak: 0, total: 0 };
        current.total += 1;
        current.weak += grounding.strength === "Weak" ? 1 : 0;
        totals[department] = current;
        return totals;
      },
      {}
    )
  ).sort((left, right) => {
    if (right[1].weak !== left[1].weak) {
      return right[1].weak - left[1].weak;
    }

    return right[1].total - left[1].total;
  });
  const mostAtRiskDepartment = riskByDepartment[0];

  function buildFilterHref(nextFilter: ActivityFilter) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextFilter === "All") {
      nextSearchParams.delete("action");
    } else {
      nextSearchParams.set("action", nextFilter);
    }

    const queryString = nextSearchParams.toString();

    return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
  }

  return (
    <>
      <DashboardTopBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search events, labels, or descriptions..."
      />

      <DashboardPageHeader
        eyebrow="Operational History"
        title="Activity Log"
        description="Review the latest mailbox decisions and document-library changes so the prototype has a clear, readable trail of what happened."
        meta={`${events.length} recent events`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/api/activity/export"
              className={dashboardSecondaryButtonClassName}
            >
              Download JSON
            </Link>
            <Link
              href="/dashboard"
              className={dashboardGhostButtonClassName}
            >
              Back to Overview
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className={`${dashboardPanelClassName} p-5`}>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#EEF0FF] text-[#5C61FF]">
                <DashboardIcon name="activity" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Filter Results
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[#1E2340]">
                  Filter Results
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {activityFilters.map((filter) => {
                const isActive = filter === activeFilter;

                return (
                  <Link
                    key={filter}
                    href={buildFilterHref(filter)}
                    scroll={false}
                    className={`flex items-center justify-between rounded-[22px] border px-4 py-3.5 text-sm font-semibold transition ${
                      isActive
                        ? "border-[#D1D7FF] bg-[#F6F7FF] text-[#4F57E8] shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                        : "border-white/80 bg-white/68 text-slate-500 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <span>{getActivityFilterLabel(filter)}</span>
                    <span className="rounded-full bg-white/84 px-2.5 py-1 text-xs font-semibold text-slate-400">
                      {counts[filter]}
                    </span>
                  </Link>
                );
              })}
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-500">
              {activeFilter === "All"
                ? "Showing every tracked workflow event in the local audit history."
                : `Focused on ${getActivityFilterLabel(activeFilter).toLowerCase()} events only.`}
            </p>
          </div>

          <div className={`${dashboardPanelClassName} p-5`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Activity Health
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
              Activity Health
            </h3>

            <div className="mt-6 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>Approval share</span>
                  <span className="font-semibold text-[#4F57E8]">{approvalRate}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#E7EBF6]">
                  <div
                    className="h-2.5 rounded-full bg-[#5C61FF]"
                    style={{ width: `${approvalRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>Document activity</span>
                  <span className="font-semibold text-[#4F57E8]">
                    {documentChangeRate}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#E7EBF6]">
                  <div
                    className="h-2.5 rounded-full bg-[#8E96FF]"
                    style={{ width: `${documentChangeRate}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] border border-white/75 bg-white/64 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Search State
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                    {normalizedSearchQuery.length > 0 ? "Filtered" : "All Events"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/75 bg-white/64 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Current View
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                    {visibleEvents.length} shown
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${dashboardPanelClassName} p-5`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Review Pressure
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
              Review Pressure
            </h3>

            <div className="mt-6 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>Approval-ready share</span>
                  <span className="font-semibold text-[#4F57E8]">
                    {approvalReadinessRate}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#E7EBF6]">
                  <div
                    className="h-2.5 rounded-full bg-[#5C61FF]"
                    style={{ width: `${approvalReadinessRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>Weak-support pressure</span>
                  <span className="font-semibold text-[#D43D63]">
                    {weakGroundingRate}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#F6E3E8]">
                  <div
                    className="h-2.5 rounded-full bg-[#D43D63]"
                    style={{ width: `${weakGroundingRate}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[22px] border border-white/75 bg-white/64 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Approval-ready
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                    {approvalReadyCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/75 bg-white/64 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Weak support
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                    {weakGroundingCount}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/75 bg-white/64 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Unassigned
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                    {unassignedQueueCount}
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/75 bg-white/64 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Highest-risk department
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {mostAtRiskDepartment
                    ? mostAtRiskDepartment[0]
                    : "No live queue"}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {mostAtRiskDepartment
                    ? mostAtRiskDepartment[1].weak > 0
                      ? `${mostAtRiskDepartment[1].weak} weakly grounded cases and ${escalatedQueueCount} escalations are currently putting the most review pressure on this workspace.`
                      : "No department is currently carrying weak-support cases."
                    : "Review pressure will appear here once cases are flowing through the queue."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`${dashboardPanelClassName} overflow-hidden p-5 md:p-6`}>
            <div className="mb-5 grid grid-cols-[minmax(180px,1.2fr)_150px_minmax(0,1.5fr)] gap-4 border-b border-white/80 pb-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              <p>Event</p>
              <p>Source</p>
              <p>Description</p>
            </div>

            {events.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/80 bg-white/54 px-6 py-12 text-center text-sm text-slate-500">
                No activity has been tracked yet. Approvals, ownership changes, drafts, notes, and document updates will appear here as you use the workspace.
              </div>
            ) : visibleEvents.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/80 bg-white/54 px-6 py-12 text-center text-sm text-slate-500">
                {filteredEvents.length === 0
                  ? "No events match the current activity filter."
                  : "No events match the current search."}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-4 rounded-[26px] border border-white/80 bg-white/64 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)] lg:grid-cols-[minmax(180px,1.2fr)_150px_minmax(0,1.5fr)]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#EEF0FF] text-[#5C61FF]">
                          <DashboardIcon
                            name={
                              event.entityType === "document" ? "document" : "sparkles"
                            }
                            className="h-5 w-5"
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="text-lg font-semibold tracking-tight text-[#1E2340]">
                            {event.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${activityActionMeta[event.action].classes}`}
                            >
                              {activityActionMeta[event.action].label}
                            </span>
                            <span className="text-xs font-medium text-slate-400">
                              {formatActivityTimestamp(event.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <p className="text-sm font-medium text-slate-500">
                        {getEventSourceLabel(event)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm leading-7 text-slate-500">
                        {event.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {activeFilter === "All" ? (
                          <Link
                            href={buildFilterHref(event.action)}
                            scroll={false}
                            className={dashboardGhostButtonClassName}
                          >
                            View Similar
                          </Link>
                        ) : null}
                        {event.href ? (
                          <Link
                            href={event.href}
                            className={dashboardSecondaryButtonClassName}
                          >
                            Open Related Item
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-5 text-sm text-slate-500">
              Showing {visibleEvents.length} of {filteredEvents.length} events in the current view.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className={`${dashboardPanelClassName} p-5 md:p-6`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Weekly Volume Trend
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
                Weekly Volume Trend
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Activity volume across the last seven active days in the audit trail.
              </p>

              <div className="mt-8 grid h-[180px] grid-cols-7 gap-3">
                {weeklySeries.map((entry) => (
                  <div key={entry.key} className="flex flex-col items-center gap-3">
                    <div className="flex h-full w-full items-end rounded-[24px] bg-white/44 px-2 py-3">
                      <div
                        className="w-full rounded-t-[18px] bg-[#5C61FF]"
                        style={{
                          height: `${Math.max(12, (entry.count / maxWeeklyValue) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">{entry.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{entry.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${dashboardPanelClassName} p-5 md:p-6`}>
              <span className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-[#EEF0FF] text-[#5C61FF]">
                <DashboardIcon name="shield" className="h-7 w-7" />
              </span>
              <p className="mt-6 text-center text-5xl font-semibold tracking-tight text-[#1E2340]">
                {counts.All}
              </p>
              <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                total logged events
              </p>
              <p className="mt-6 text-center text-sm leading-7 text-slate-500">
                Recent audit coverage across mailbox approvals, assignments, notes, and document changes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
