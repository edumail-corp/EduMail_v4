import Link from "next/link";
import { cookies } from "next/headers";
import {
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
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

function getStorageStatusClassName(status: "active" | "stored" | "missing") {
  if (status === "active") {
    return "bg-[#E9FBF1] text-[#0C8A53]";
  }

  if (status === "stored") {
    return "bg-[#EAF4FF] text-[#1663A8]";
  }

  return "bg-[#FFF3D9] text-[#B67100]";
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

  return (
    <>
      <DashboardTopBar label={isPolish ? "Panel admina" : "Admin"} />

      <DashboardPageHeader
        eyebrow={isPolish ? "Operacje workspace" : "Workspace Operations"}
        title={isPolish ? "Panel administracyjny" : "Admin"}
        description={
          isPolish
            ? "Na razie ta sekcja trzyma tylko to, co jest naprawdę praktyczne: katalog zespołu i lokalny ślad danych na dysku."
            : "For now, this section keeps only what is genuinely practical: the staff directory and the local on-disk data footprint."
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {isPolish ? "Zespół" : "Workspace Team"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
            {isPolish ? "Katalog pracowników" : "Staff Directory"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isPolish
              ? "To wystarcza, dopóki nie wdrożymy prawdziwego logowania, ról i członkostwa workspace."
              : "This is enough until real sign-in, roles, and workspace membership are implemented."}
          </p>

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
            {isPolish ? "Lokalne przechowywanie" : "Local Storage"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
            {isPolish ? "Ślad danych na dysku" : "On-Disk Data Footprint"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isPolish
              ? "To jest jedyna inna rzecz, która realnie pomaga teraz: pokazuje gdzie dane są zapisywane i ile miejsca zajmują."
              : "This is the only other thing that materially helps right now: it shows where the data is written and how much space it uses."}
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
            {snapshot.localStorage.locations.map((location) => {
              const locationStatus = location.active
                ? "active"
                : location.present
                  ? "stored"
                  : "missing";

              return (
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStorageStatusClassName(
                        locationStatus
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
              );
            })}
          </div>
        </article>
      </section>
    </>
  );
}
