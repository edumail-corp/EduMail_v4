"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import {
  activityActionMeta,
  activityFilters,
  getActivityFilterLabel,
  type ActivityEvent,
  type ActivityFilter,
} from "@/lib/activity-log";
import {
  DashboardIcon,
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";

function matchesActivitySearch(
  event: ActivityEvent,
  query: string,
  language: "English" | "Polish"
) {
  if (query.length === 0) {
    return true;
  }

  const searchableText = [
    event.title,
    event.description,
    event.entityId,
    event.entityType,
    getActivityFilterLabel(event.action, language),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

function getEntityTypeLabel(
  entityType: ActivityEvent["entityType"],
  language: "English" | "Polish"
) {
  if (language === "Polish") {
    const polishLabels: Record<ActivityEvent["entityType"], string> = {
      email: "Sprawa",
      document: "Dokument",
      staff: "Zespół",
      inbox: "Skrzynka",
    };

    return polishLabels[entityType];
  }

  const englishLabels: Record<ActivityEvent["entityType"], string> = {
    email: "Case",
    document: "Document",
    staff: "Staff",
    inbox: "Inbox",
  };

  return englishLabels[entityType];
}

function getRelativeTimeLabel(
  timestamp: string,
  language: "English" | "Polish",
  referenceTimeMs: number
) {
  const elapsedMilliseconds = referenceTimeMs - new Date(timestamp).getTime();
  const elapsedMinutes = Math.max(0, Math.round(elapsedMilliseconds / 60000));

  if (elapsedMinutes < 60) {
    if (language === "Polish") {
      return elapsedMinutes <= 1
        ? "przed chwilą"
        : `${elapsedMinutes} min temu`;
    }

    return elapsedMinutes <= 1 ? "just now" : `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    if (language === "Polish") {
      return `${elapsedHours} godz. temu`;
    }

    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.round(elapsedHours / 24);

  if (language === "Polish") {
    return `${elapsedDays} dni temu`;
  }

  return `${elapsedDays}d ago`;
}

export function ActivityStreamView({
  events,
  generatedAt,
}: Readonly<{
  events: ActivityEvent[];
  generatedAt: string;
}>) {
  const { preferences, formatDateTime, formatDay } = useUserPreferences();
  const isPolish = preferences.language === "Polish";
  const referenceTimeMs = new Date(generatedAt).getTime();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("All");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const visibleEvents = events.filter((event) => {
    if (activeFilter !== "All" && event.action !== activeFilter) {
      return false;
    }

    return matchesActivitySearch(event, normalizedSearchQuery, preferences.language);
  });
  const last24HourEventCount = events.filter(
    (event) => referenceTimeMs - new Date(event.timestamp).getTime() <= 24 * 60 * 60 * 1000
  ).length;
  const inboxCheckpointCount = events.filter(
    (event) => event.entityType === "inbox"
  ).length;
  const staffChangeCount = events.filter(
    (event) => event.entityType === "staff"
  ).length;
  const visibleDaySections: Array<{
    key: string;
    label: string;
    events: ActivityEvent[];
  }> = [];

  for (const event of visibleEvents) {
    const dayKey = event.timestamp.slice(0, 10);
    const previousSection = visibleDaySections.at(-1);

    if (!previousSection || previousSection.key !== dayKey) {
      visibleDaySections.push({
        key: dayKey,
        label: formatDay(event.timestamp),
        events: [event],
      });
      continue;
    }

    previousSection.events.push(event);
  }

  return (
    <>
      <DashboardTopBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          isPolish
            ? "Szukaj po tytule zdarzenia, opisie lub typie encji..."
            : "Search by event title, description, or entity type..."
        }
      />

      <DashboardPageHeader
        eyebrow={isPolish ? "Log operacyjny" : "Operations Log"}
        title={isPolish ? "Aktywność" : "Activity"}
        description={
          isPolish
            ? "Przeglądaj najważniejsze decyzje i zmiany w workspace, w tym ruch spraw, dokumenty, odświeżenia skrzynki i działania zespołu."
            : "Review the key decisions and changes across the workspace, including case movement, documents, inbox refreshes, and team actions."
        }
        meta={
          isPolish
            ? `${visibleEvents.length} z ${events.length} zdarzeń`
            : `${visibleEvents.length} of ${events.length} events`
        }
        actions={
          <a
            href="/api/activity/export"
            className={`${dashboardSecondaryButtonClassName} gap-3`}
          >
            <DashboardIcon name="download" className="h-[18px] w-[18px]" />
            {isPolish ? "Eksportuj log aktywności" : "Export activity log"}
          </a>
        }
      />

      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <article className={`${dashboardPanelClassName} px-5 py-5 md:px-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Całkowity strumień" : "Full Stream"}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
            {events.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isPolish
              ? "Wszystkie zapisane decyzje i zdarzenia dostępne dla tego workspace."
              : "All recorded decisions and workflow events currently available in this workspace."}
          </p>
        </article>

        <article className={`${dashboardPanelClassName} px-5 py-5 md:px-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Ostatnie 24h" : "Last 24h"}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
            {last24HourEventCount}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isPolish
              ? "Świeże zmiany dotyczące spraw, dokumentów, dostępu zespołu i odświeżeń skrzynki."
              : "Fresh changes across cases, documents, team access, and inbox refresh."}
          </p>
        </article>

        <article className={`${dashboardPanelClassName} px-5 py-5 md:px-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Kluczowe operacje" : "Key Operations"}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
            {inboxCheckpointCount + staffChangeCount}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isPolish
              ? `${inboxCheckpointCount} checkpointów skrzynki • ${staffChangeCount} zmian zespołu`
              : `${inboxCheckpointCount} inbox refreshes • ${staffChangeCount} staff changes`}
          </p>
        </article>
      </section>

      <section className={`${dashboardPanelClassName} mb-6 px-5 py-5 md:px-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {isPolish ? "Filtry strumienia" : "Stream Filters"}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {isPolish
                ? "Zawęź widok do konkretnego typu aktywności albo przeszukaj sprawy, dokumenty i działania zespołu bez opuszczania dashboardu."
                : "Narrow the feed to a specific activity type or search cases, documents, and team actions without leaving the dashboard."}
            </p>
          </div>

          {searchQuery.length > 0 || activeFilter !== "All" ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("All");
              }}
              className={dashboardGhostButtonClassName}
            >
              {isPolish ? "Wyczyść filtry" : "Clear Filters"}
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {activityFilters.map((filterOption) => {
            const isActive = activeFilter === filterOption;

            return (
              <button
                key={filterOption}
                type="button"
                onClick={() => setActiveFilter(filterOption)}
                className={
                  isActive
                    ? "inline-flex items-center rounded-full border border-[#C7CEFF] bg-[#EEF0FF] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#4F57E8]"
                    : "inline-flex items-center rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:bg-white hover:text-[#4F57E8]"
                }
              >
                {getActivityFilterLabel(filterOption, preferences.language)}
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${dashboardPanelClassName} px-5 py-5 md:px-6`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {isPolish ? "Chronologia" : "Timeline"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#1E2340]">
              {isPolish ? "Najnowsze zdarzenia" : "Latest Events"}
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            {isPolish
              ? "Najświeższe wpisy są zawsze na górze."
              : "Newest entries always appear first."}
          </p>
        </div>

        {visibleDaySections.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#D9DEFF] bg-[#F7F8FF] px-5 py-8 text-sm leading-7 text-slate-500">
            {isPolish
              ? "Żadne zdarzenia nie pasują do bieżących filtrów. Zmień filtr lub wyszukiwanie, aby rozszerzyć widok."
              : "No events match the current filters. Adjust the filter or search to widen the view."}
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {visibleDaySections.map((section) => (
              <div key={section.key}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full border border-white/80 bg-white/84 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {section.label}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#DCE1FF] to-transparent" />
                </div>

                <div className="space-y-3">
                  {section.events.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-[24px] border border-white/80 bg-white/72 px-4 py-4 shadow-[0_14px_36px_rgba(140,153,179,0.1)]"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${activityActionMeta[event.action].classes}`}
                            >
                              {getActivityFilterLabel(event.action, preferences.language)}
                            </span>
                            <span className="rounded-full border border-[#DCE1FF] bg-[#F5F6FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {getEntityTypeLabel(event.entityType, preferences.language)}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                              {getRelativeTimeLabel(
                                event.timestamp,
                                preferences.language,
                                referenceTimeMs
                              )}
                            </span>
                          </div>

                          <h4 className="mt-3 text-base font-semibold text-[#1E2340]">
                            {event.title}
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-slate-500">
                            {event.description}
                          </p>
                          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                            {formatDateTime(event.timestamp)} • ID {event.entityId}
                          </p>
                        </div>

                        {event.href ? (
                          <Link
                            href={event.href}
                            className={`${dashboardGhostButtonClassName} shrink-0 gap-2`}
                          >
                            <DashboardIcon name="trend" className="h-[16px] w-[16px]" />
                            {isPolish ? "Otwórz" : "Open"}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
