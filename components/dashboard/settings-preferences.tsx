"use client";

import type { ReactNode } from "react";
import {
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";
import {
  languageOptions,
  type InboxDensityPreference,
  type LanguagePreference,
  type ThemePreference,
  type TimeFormatPreference,
} from "@/lib/user-preferences";

function PreferencesCard({
  eyebrow,
  title,
  description,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: Readonly<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/75 bg-white/62 px-4 py-4 text-left shadow-[0_14px_32px_rgba(141,153,179,0.12)] transition hover:bg-white/82"
      aria-pressed={checked}
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <span
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-[#5C61FF]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_8px_18px_rgba(91,102,128,0.24)] transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsPreferences() {
  const {
    hasHydrated,
    preferences,
    resetPreferences,
    resolvedTheme,
    updatePreference,
  } = useUserPreferences();
  const isPolish = preferences.language === "Polish";
  const themeOptions: Array<{ value: ThemePreference; label: string }> = isPolish
    ? [
        { value: "light", label: "Jasny" },
        { value: "system", label: "Systemowy" },
        { value: "dark", label: "Ciemny" },
      ]
    : [
        { value: "light", label: "Light" },
        { value: "system", label: "System" },
        { value: "dark", label: "Dark" },
      ];
  const densityOptions: Array<{
    value: InboxDensityPreference;
    label: string;
    hint: string;
  }> = isPolish
    ? [
        {
          value: "comfortable",
          label: "Wygodny",
          hint: "Większe odstępy dla łatwiejszego czytania.",
        },
        {
          value: "compact",
          label: "Kompaktowy",
          hint: "Gęstsze wiersze wiadomości dla szybszego przeglądania skrzynki.",
        },
      ]
    : [
        {
          value: "comfortable",
          label: "Comfortable",
          hint: "Larger spacing for easier reading.",
        },
        {
          value: "compact",
          label: "Compact",
          hint: "Tighter message rows for denser inbox browsing.",
        },
      ];

  const previewCardClassName =
    resolvedTheme === "dark"
      ? "border-slate-700 bg-[#10172A] text-slate-100"
      : "border-white/75 bg-white/68 text-slate-900";
  const previewMutedClassName =
    resolvedTheme === "dark" ? "text-slate-400" : "text-slate-500";

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
      <div className="space-y-4">
        <PreferencesCard
          eyebrow={isPolish ? "Wygląd" : "Appearance"}
          title={isPolish ? "Motyw i widok" : "Theme and Display"}
          description={
            isPolish
              ? "Ustaw ogólny wygląd, który wolisz podczas przeglądania wiadomości i szkiców."
              : "Set the overall look you prefer when reviewing messages and drafts."
          }
        >
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]">
              <p className="text-sm font-semibold text-slate-900">
                {isPolish ? "Motyw" : "Theme"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {themeOptions.map((option) => {
                  const isActive = preferences.theme === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updatePreference("theme", option.value)}
                      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[#5C61FF] text-white shadow-[0_16px_34px_rgba(92,97,255,0.24)]"
                          : "border border-white/80 bg-white/78 text-slate-500 hover:bg-white hover:text-[#4F57E8]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {isPolish
                  ? "Tryb ciemny teraz od razu aktualizuje motyw dashboardu na tym urządzeniu."
                  : "Dark mode now updates the live dashboard theme for this device."}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]">
              <p className="text-sm font-semibold text-slate-900">
                {isPolish ? "Gęstość skrzynki" : "Inbox density"}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {densityOptions.map((option) => {
                  const isActive = preferences.inboxDensity === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updatePreference("inboxDensity", option.value)
                      }
                      className={`rounded-[22px] border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-[#C7CEFF] bg-[#F7F8FF] shadow-[0_16px_34px_rgba(120,129,255,0.14)]"
                          : "border-white/75 bg-white/82 hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {option.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {option.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </PreferencesCard>

        <PreferencesCard
          eyebrow={isPolish ? "Język" : "Language"}
          title={isPolish ? "Język i czas" : "Language and Time"}
          description={
            isPolish
              ? "Trzymaj pod ręką kilka prostych preferencji dotyczących czytania."
              : "Keep a couple of simple reading preferences close at hand."
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]">
              <p className="text-sm font-semibold text-slate-900">
                {isPolish ? "Język" : "Language"}
              </p>
              <select
                value={preferences.language}
                onChange={(event) =>
                  updatePreference(
                    "language",
                    event.target.value as LanguagePreference
                  )
                }
                className="mt-4 w-full rounded-[18px] border border-white/80 bg-white/82 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
              >
                {languageOptions.map((option) => (
                  <option key={option} value={option}>
                    {isPolish
                      ? option === "English"
                        ? "Angielski"
                        : "Polski"
                      : option}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]">
              <p className="text-sm font-semibold text-slate-900">
                {isPolish ? "Format czasu" : "Time format"}
              </p>
              <select
                value={preferences.timeFormat}
                onChange={(event) =>
                  updatePreference(
                    "timeFormat",
                    event.target.value as TimeFormatPreference
                  )
                }
                className="mt-4 w-full rounded-[18px] border border-white/80 bg-white/82 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
              >
                <option value="24h">
                  {isPolish ? "24-godzinny" : "24-hour"}
                </option>
                <option value="12h">
                  {isPolish ? "12-godzinny" : "12-hour"}
                </option>
              </select>
            </label>
          </div>
        </PreferencesCard>

        <PreferencesCard
          eyebrow={isPolish ? "Powiadomienia" : "Notifications"}
          title={isPolish ? "Proste preferencje" : "Simple Preferences"}
          description={
            isPolish
              ? "Kilka lekkich ustawień określających, jak workspace ma zachowywać się podczas przeglądu."
              : "A few lightweight choices for how the workspace should behave during review."
          }
        >
          <div className="space-y-3">
            <PreferenceToggle
              label={isPolish ? "Powiadomienia pulpitu" : "Desktop notifications"}
              description={
                isPolish
                  ? "Pokazuj powiadomienie przeglądarki po zapisach i zatwierdzeniach w tym workspace."
                  : "Show a browser notification after saves and approvals complete in this workspace."
              }
              checked={preferences.desktopNotifications}
              onChange={(checked) =>
                updatePreference("desktopNotifications", checked)
              }
            />
            <PreferenceToggle
              label={isPolish ? "Potwierdzenia działań" : "Send confirmations"}
              description={
                isPolish
                  ? "Pozostaw szybkie komunikaty potwierdzające po zapisaniu szkicu lub zatwierdzeniu odpowiedzi."
                  : "Keep quick confirmation feedback turned on after drafts are saved or replies are approved."
              }
              checked={preferences.sendConfirmations}
              onChange={(checked) =>
                updatePreference("sendConfirmations", checked)
              }
            />
          </div>
        </PreferencesCard>
      </div>

      <div className="space-y-4">
        <PreferencesCard
          eyebrow={isPolish ? "Podgląd" : "Preview"}
          title={isPolish ? "Migawka ustawień" : "Preference Snapshot"}
          description={
            isPolish
              ? "Kompaktowy podgląd tego, jak skonfigurowane są Twoje bieżące wybory."
              : "A compact preview of how your current choices are configured."
          }
        >
          <div
            className={`rounded-[28px] border p-5 shadow-[0_18px_42px_rgba(141,153,179,0.12)] ${previewCardClassName}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Inbox preview</p>
                <p className={`mt-1 text-sm ${previewMutedClassName}`}>
                  {preferences.language} • {preferences.timeFormat} •{" "}
                  {isPolish
                    ? preferences.inboxDensity === "compact"
                      ? "kompaktowy"
                      : "wygodny"
                    : preferences.inboxDensity}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  preferences.theme === "dark"
                    ? "bg-slate-800 text-slate-100"
                    : "bg-[#EEF0FF] text-[#4F57E8]"
                }`}
              >
                {preferences.theme === "system"
                  ? isPolish
                    ? "Motyw systemowy"
                    : "System theme"
                  : isPolish
                    ? preferences.theme === "dark"
                      ? "Motyw ciemny"
                      : "Motyw jasny"
                    : `${preferences.theme[0].toUpperCase()}${preferences.theme.slice(1)} theme`}
              </span>
            </div>

            <div
              className={`mt-5 rounded-[22px] border px-4 py-4 ${
                preferences.theme === "dark"
                  ? "border-slate-700 bg-[#162036]"
                  : "border-white/75 bg-white/82"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {isPolish ? "Zapytanie studenta" : "Student inquiry"}
                  </p>
                  <p className={`mt-1 text-sm ${previewMutedClassName}`}>
                    {isPolish ? "Wygenerowana odpowiedź gotowa" : "Generated reply ready"}
                  </p>
                </div>
                <span className={`text-xs ${previewMutedClassName}`}>
                  09:42
                </span>
              </div>
              <p
                className={`mt-3 text-sm leading-6 ${
                  preferences.inboxDensity === "compact"
                    ? "line-clamp-1"
                    : "line-clamp-2"
                } ${previewMutedClassName}`}
              >
                {isPolish
                  ? "Skrzynka pozostaje tutaj czystsza, a otwarta wiadomość pokazuje sugerowaną odpowiedź i kluczowe metadane."
                  : "The inbox stays cleaner here, while the opened message shows the suggested reply and key metadata."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetPreferences}
              disabled={!hasHydrated}
              className={dashboardGhostButtonClassName}
            >
              {isPolish ? "Przywróć domyślne" : "Reset to Defaults"}
            </button>
            <span className={dashboardPrimaryButtonClassName}>
              {isPolish ? "Ustawienia zapisują się automatycznie" : "Preferences save automatically"}
            </span>
          </div>
        </PreferencesCard>

        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Uwagi" : "Notes"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
            {isPolish ? "Zachowaj prostotę ustawień" : "Keep Settings Lightweight"}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {isPolish
              ? "Ta strona skupia się teraz na prostych preferencjach osobistych zamiast na gotowości workspace i planowaniu integracji. Ustawienia są celowo lekkie i zapisywane lokalnie na bieżącym urządzeniu."
              : "This page now focuses on simple personal preferences instead of workspace readiness and integration planning. The controls here are intentionally light and saved locally for the current device."}
          </p>
        </article>
      </div>
    </section>
  );
}
