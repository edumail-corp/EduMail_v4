import Link from "next/link";
import { cookies } from "next/headers";
import {
  DashboardIcon,
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { translateDepartment } from "@/lib/email-data";
import {
  translateWorkspaceProviderStatus,
  translateWorkspaceReadinessCategory,
  translateWorkspaceRole,
  translateWorkspaceUserStatus,
} from "@/lib/workspace-config";
import { getWorkspaceSettingsSnapshot } from "@/lib/server/services/workspace-settings-service";
import {
  getLocaleForLanguage,
  isLanguagePreference,
  userPreferencesLanguageCookie,
  type LanguagePreference,
} from "@/lib/user-preferences";

function getProviderStatusClassName(
  status: "local" | "manual_required" | "planned" | "configured"
) {
  if (status === "local") {
    return "bg-[#E9FBF1] text-[#0C8A53]";
  }

  if (status === "manual_required") {
    return "bg-[#FFF3D9] text-[#B67100]";
  }

  if (status === "configured") {
    return "bg-[#EAF4FF] text-[#1663A8]";
  }

  return "bg-[#EEF0FF] text-[#555CF0]";
}

function getStaffStatusClassName(status: "active" | "pending") {
  return status === "active"
    ? "bg-[#E9FBF1] text-[#0C8A53]"
    : "bg-[#FFF3D9] text-[#B67100]";
}

function formatStorageBytes(bytes: number, locale: string) {
  if (bytes < 1024) {
    return `${bytes.toLocaleString(locale)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString(locale, {
      maximumFractionDigits: 1,
    })} KB`;
  }

  return `${(bytes / (1024 * 1024)).toLocaleString(locale, {
    maximumFractionDigits: 1,
  })} MB`;
}

export default async function AdminPage() {
  const languageCookie = (await cookies()).get(userPreferencesLanguageCookie)?.value;
  const language: LanguagePreference = isLanguagePreference(languageCookie)
    ? languageCookie
    : "English";
  const isPolish = language === "Polish";
  const locale = getLocaleForLanguage(language);
  const snapshot = await getWorkspaceSettingsSnapshot(language);
  const localCount = snapshot.integrationCounts.local;
  const manualRequiredCount = snapshot.integrationCounts.manualRequired;
  const plannedCount = snapshot.integrationCounts.planned;
  const departmentCount = snapshot.operatingDepartments.length;
  const configuredSignalCount = snapshot.environmentSignals.filter(
    (signal) => signal.status === "configured"
  ).length;

  const metricCards = [
    {
      label: isPolish ? "Lokalne teraz" : "Local Now",
      value: String(localCount),
      caption: isPolish
        ? "Obszary działające lokalnie bez zewnętrznego dostawcy."
        : "Areas already working locally without an external provider.",
      icon: "database" as const,
    },
    {
      label: isPolish ? "Wymaga decyzji" : "Manual Decisions",
      value: String(manualRequiredCount),
      caption: isPolish
        ? "Integracje lub polityki, które nadal trzeba wybrać."
        : "Integrations or policies that still need to be chosen.",
      icon: "warning" as const,
    },
    {
      label: isPolish ? "Planowane" : "Planned",
      value: String(plannedCount),
      caption: isPolish
        ? "Elementy zaplanowane, ale jeszcze nie podłączone."
        : "Capabilities planned but not wired into a live provider yet.",
      icon: "sparkles" as const,
    },
    {
      label: isPolish ? "Skonfigurowane kontrakty" : "Configured Contracts",
      value: String(configuredSignalCount),
      caption: isPolish
        ? "Kategorie z wykrytymi zmiennymi środowiskowymi dla przyszłych integracji."
        : "Categories with environment variables already detected for future integrations.",
      icon: "users" as const,
    },
    {
      label: isPolish ? "Działy robocze" : "Operating Departments",
      value: String(departmentCount),
      caption: snapshot.operatingDepartments
        .map((department) => translateDepartment(department, language))
        .join(" • "),
      icon: "overview" as const,
    },
  ];

  return (
    <>
      <DashboardTopBar label={isPolish ? "Panel admina" : "Admin"} />

      <DashboardPageHeader
        eyebrow={isPolish ? "Gotowość workspace" : "Workspace Readiness"}
        title={isPolish ? "Panel administracyjny" : "Admin Control Surface"}
        description={
          isPolish
            ? "To jest przyszły punkt kontroli dla integracji, gotowości operacyjnej i kształtu domeny produktu. Ustawienia osobiste pozostają osobne."
            : "This is the future control point for integrations, operational readiness, and the product domain shape. Personal settings stay separate."
        }
        meta={
          isPolish
            ? `Migawka ${new Date().toLocaleDateString(locale)}`
            : `Snapshot ${new Date().toLocaleDateString(locale)}`
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/settings"
              className={dashboardSecondaryButtonClassName}
            >
              {isPolish ? "Preferencje osobiste" : "Personal Settings"}
            </Link>
            <Link href="/dashboard" className={dashboardGhostButtonClassName}>
              {isPolish ? "Wróć do panelu" : "Back to Overview"}
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-5">
        {metricCards.map((card) => (
          <article key={card.label} className={`${dashboardPanelClassName} p-5`}>
            <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#EEF0FF] text-[#5C61FF]">
              <DashboardIcon name={card.icon} className="h-5 w-5" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {card.label}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-[#1E2340]">
              {card.value}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">{card.caption}</p>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Gotowość dostawców" : "Provider Readiness"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
            {isPolish ? "Stan integracji" : "Integration Status"}
          </h3>
          <div className="mt-6 space-y-3">
            {snapshot.integrations.map((integration) => (
              <div
                key={integration.id}
                className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {integration.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {integration.summary}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getProviderStatusClassName(
                      integration.status
                    )}`}
                  >
                    {translateWorkspaceProviderStatus(integration.status, language)}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Następny krok" : "Next Step"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {integration.nextStep}
                </p>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-4">
          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {isPolish ? "Zespół" : "Workspace Team"}
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
              {isPolish ? "Katalog pracowników" : "Staff Directory"}
            </h3>
            <div className="mt-6 space-y-3">
              {snapshot.staffDirectory.map((user) => (
                <div
                  key={user.id}
                  className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                        {translateWorkspaceRole(user.role, language)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStaffStatusClassName(
                        user.status
                      )}`}
                    >
                      {translateWorkspaceUserStatus(user.status, language)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {isPolish ? "Kształt workflow" : "Workflow Shape"}
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
              {isPolish ? "Etapy operacyjne" : "Operating Stages"}
            </h3>
            <div className="mt-6 space-y-3">
              {snapshot.workflowStages.map((stage) => (
                <div
                  key={stage.id}
                  className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                >
                  <p className="text-sm font-semibold text-slate-900">{stage.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {stage.description}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-4">
        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Powiązania adapterów" : "Adapter Bindings"}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-[#1E2340]">
                {isPolish ? "Aktywna konfiguracja wewnętrzna" : "Active Internal Configuration"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {isPolish
                  ? "To pokazuje, który adapter działa teraz za każdą usługą oraz która zmienna środowiskowa będzie sterować podmianą dostawcy później."
                  : "This shows which adapter is active behind each service today and which environment variable will control provider swaps later."}
              </p>
            </div>
            <span className="rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-semibold text-[#555CF0]">
              {isPolish
                ? `${snapshot.adapterBindings.length} powiązań`
                : `${snapshot.adapterBindings.length} bindings`}
            </span>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {snapshot.adapterBindings.map((binding) => (
              <div
                key={binding.id}
                className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {binding.label}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      {binding.envVarName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getProviderStatusClassName(
                      binding.status
                    )}`}
                  >
                    {translateWorkspaceProviderStatus(binding.status, language)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {isPolish ? "Aktywny dostawca" : "Active Provider"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {binding.activeProvider.toUpperCase()}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {isPolish ? "Zażądano" : "Requested"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {binding.requestedProvider
                        ? binding.requestedProvider.toUpperCase()
                        : isPolish
                          ? "Domyślnie"
                          : "Default"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {binding.summary}
                </p>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Następny krok" : "Next Step"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {binding.nextStep}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Kontrakty środowiskowe" : "Environment Contracts"}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-[#1E2340]">
                {isPolish
                  ? "Sygnały gotowości dostawców"
                  : "Provider Configuration Signals"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {isPolish
                  ? "Pokazuje, które zmienne środowiskowe zostały już ustawione dla przyszłych integracji i czego nadal brakuje."
                  : "This shows which environment contracts are already configured for future integrations and what is still missing."}
              </p>
            </div>
            <span className="rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-semibold text-[#555CF0]">
              {isPolish
                ? `${configuredSignalCount}/${snapshot.environmentSignals.length} gotowe`
                : `${configuredSignalCount}/${snapshot.environmentSignals.length} configured`}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {snapshot.environmentSignals.map((signal) => (
              <div
                key={signal.id}
                className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {signal.label}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {translateWorkspaceReadinessCategory(signal.category, language)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {signal.summary}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getProviderStatusClassName(
                      signal.status
                    )}`}
                  >
                    {translateWorkspaceProviderStatus(signal.status, language)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {isPolish ? "Wymagane zmienne" : "Required Env Vars"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {signal.requiredEnvVars.length.toLocaleString(locale)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {signal.requiredEnvVars.join(" • ")}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {isPolish ? "Wykryto" : "Detected"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {signal.configuredEnvVars.length.toLocaleString(locale)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {signal.configuredEnvVars.length > 0
                        ? signal.configuredEnvVars.join(" • ")
                        : isPolish
                          ? "Brak"
                          : "None"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Następny krok" : "Next Step"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {signal.nextStep}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Lokalne przechowywanie" : "Local Storage"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
            {isPolish ? "Ślad danych na dysku" : "On-Disk Data Footprint"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isPolish
              ? "To pokazuje, gdzie bieżące dane lokalne są zapisywane w tym środowisku i jak duży jest śledzony zestaw plików."
              : "This shows where current local data is written in this environment and how large the tracked file set is."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] bg-slate-50/85 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {isPolish ? "Śledzony rozmiar" : "Tracked Size"}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatStorageBytes(snapshot.localStorage.totalTrackedBytes, locale)}
              </p>
            </div>
            <div className="rounded-[20px] bg-slate-50/85 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {isPolish ? "Śledzone pliki" : "Tracked Files"}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {snapshot.localStorage.totalTrackedFiles.toLocaleString(locale)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {isPolish ? "Główny katalog danych" : "Data Root"}
            </p>
            <p className="mt-2 break-all font-mono text-xs text-slate-600">
              {snapshot.localStorage.rootPath}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {snapshot.localStorage.locations.map((location) => (
              <div
                key={location.id}
                className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {location.label}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {location.kind}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {location.summary}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getProviderStatusClassName(
                      location.active
                        ? "local"
                        : location.present
                          ? "configured"
                          : "manual_required"
                    )}`}
                  >
                    {location.active
                      ? isPolish
                        ? "Aktywne"
                        : "Active"
                      : location.present
                        ? isPolish
                          ? "Zapisane"
                          : "Stored"
                      : isPolish
                        ? "Brak"
                        : "Missing"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {isPolish ? "Rozmiar" : "Size"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatStorageBytes(location.approxSizeBytes, locale)}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {isPolish ? "Pliki" : "Files"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {location.fileCount.toLocaleString(locale)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 break-all font-mono text-xs text-slate-600">
                  {location.path}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Model domeny" : "Future Domain"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
            {isPolish ? "Docelowe byty danych" : "Target Domain Entities"}
          </h3>
          <div className="mt-6 space-y-3">
            {snapshot.futureDomainModel.map((entity) => (
              <div
                key={entity.id}
                className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
              >
                <p className="text-sm font-semibold text-slate-900">{entity.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {entity.description}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Praca ręczna" : "Manual Work"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
            {isPolish ? "Co nadal wymaga decyzji" : "What Still Needs Decisions"}
          </h3>
          <div className="mt-6 space-y-3">
            {snapshot.manualWorkItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
              >
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
