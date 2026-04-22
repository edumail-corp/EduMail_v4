import Link from "next/link";
import { cookies } from "next/headers";
import {
  dashboardGhostButtonClassName,
  dashboardInputClassName,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
  translateWorkspaceRole,
  translateWorkspaceUserStatus,
  type WorkspaceRole,
  type WorkspaceStorageLocationKind,
  type WorkspaceUserStatus,
} from "@/lib/workspace-config";
import { requireWorkspaceRole } from "@/lib/server/workspace-auth";
import { getWorkspaceSettingsSnapshot } from "@/lib/server/services/workspace-settings-service";
import {
  getLocaleForLanguage,
  isLanguagePreference,
  userPreferencesLanguageCookie,
  type LanguagePreference,
} from "@/lib/user-preferences";
import {
  createWorkspaceStaffMemberAction,
  deleteWorkspaceStaffMemberAction,
  updateWorkspaceStaffMemberAction,
} from "./actions";

const editableWorkspaceRoles: readonly WorkspaceRole[] = [
  "operations_admin",
  "triage_specialist",
  "knowledge_manager",
];

const editableWorkspaceStatuses: readonly WorkspaceUserStatus[] = [
  "active",
  "pending",
];

const adminDangerButtonClassName =
  "inline-flex items-center justify-center rounded-full border border-[#F8D2DA] bg-[#FFF1F4] px-4 py-2.5 text-sm font-semibold text-[#B4375C] transition hover:border-[#F0BCC8] hover:bg-[#FFE8EE]";

const disabledAdminDangerButtonClassName =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400";

function getSearchParamValue(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "string" ? value : null;
}

function getStaffMessage(
  value: string | null,
  language: LanguagePreference
) {
  if (value === "member-created") {
    return language === "Polish"
      ? "Nowy członek zespołu został zapisany."
      : "The new staff member was saved.";
  }

  if (value === "member-updated") {
    return language === "Polish"
      ? "Zmiany członka zespołu zostały zapisane."
      : "The staff member changes were saved.";
  }

  if (value === "member-deleted") {
    return language === "Polish"
      ? "Członek zespołu został usunięty."
      : "The staff member was removed.";
  }

  return null;
}

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

function isRemoteStorageKind(kind: WorkspaceStorageLocationKind) {
  return kind === "postgres" || kind === "remote";
}

function getStorageKindLabel(
  kind: WorkspaceStorageLocationKind,
  language: LanguagePreference
) {
  if (language === "Polish") {
    switch (kind) {
      case "json":
        return "JSON";
      case "sqlite":
        return "SQLite";
      case "postgres":
        return "Zdalna baza";
      case "remote":
        return "Zdalny bucket";
      case "directory":
        return "Katalog";
    }
  }

  switch (kind) {
    case "json":
      return "JSON";
    case "sqlite":
      return "SQLite";
    case "postgres":
      return "Remote DB";
    case "remote":
      return "Remote Bucket";
    case "directory":
      return "Directory";
  }
}

export default async function AdminPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const currentUser = await requireWorkspaceRole("operations_admin");
  const languageCookie = (await cookies()).get(userPreferencesLanguageCookie)?.value;
  const language: LanguagePreference = isLanguagePreference(languageCookie)
    ? languageCookie
    : "English";
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isPolish = language === "Polish";
  const locale = getLocaleForLanguage(language);
  const staffMessage = getStaffMessage(
    getSearchParamValue(resolvedSearchParams.staffMessage),
    language
  );
  const staffError = getSearchParamValue(resolvedSearchParams.staffError);
  const snapshot = await getWorkspaceSettingsSnapshot(language);
  const hasRemoteLocations = snapshot.localStorage.locations.some((location) =>
    isRemoteStorageKind(location.kind)
  );
  const localWritableRootIsTemporary =
    snapshot.localStorage.rootPath.startsWith("/tmp");
  const activeAdminCount = snapshot.staffDirectory.filter(
    (user) =>
      user.role === "operations_admin" && user.status === "active"
  ).length;

  return (
    <>
      <DashboardTopBar label={isPolish ? "Panel admina" : "Admin"} />

      <DashboardPageHeader
        eyebrow={isPolish ? "Operacje workspace" : "Workspace Operations"}
        title={isPolish ? "Panel administracyjny" : "Admin"}
        description={
          isPolish
            ? "Utrzymuj dostęp zespołu, role i podstawowy obraz tego, jak workspace wspiera operacje obsługi studentów."
            : "Keep staff access, roles, and a clear view of how the workspace supports student services operations."
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
            {snapshot.staffDirectorySource === "database"
              ? isPolish
                ? "Ta lista jest współdzielona przez dostęp do workspace i codzienną własność spraw, więc zespół pracuje na jednym rosterze."
                : "This roster is shared across workspace access and day-to-day case ownership, so the team works from one approved list."
              : isPolish
                ? "Ta lista pełni rolę zatwierdzonego rosteru zespołu dla bieżącego workspace."
                : "This roster acts as the approved team list for the current workspace."}
          </p>

          <div className="mt-4 inline-flex items-center rounded-full border border-white/75 bg-slate-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {snapshot.staffDirectorySource === "database"
              ? isPolish
                ? "Współdzielony roster"
                : "Shared roster"
              : isPolish
                ? "Zatwierdzony roster"
                : "Approved roster"}
          </div>

          {staffMessage ? (
            <div className="mt-4 rounded-[22px] border border-[#C7F0D6] bg-[#F0FBF4] px-4 py-3 text-sm text-[#19754C]">
              {staffMessage}
            </div>
          ) : null}

          {staffError ? (
            <div className="mt-4 rounded-[22px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C]">
              {staffError}
            </div>
          ) : null}

          {snapshot.staffDirectorySource !== "database" ? (
            <div className="mt-4 rounded-[22px] border border-[#DCE1FF] bg-[#F7F8FF] px-4 py-4 text-sm leading-6 text-slate-600">
              {isPolish
                ? "W tej prezentacyjnej wersji roster pozostaje tutaj tylko do odczytu. W pełnym trybie pracy ten sam roster można edytować bezpośrednio z panelu Admin."
                : "In this presentation workspace, the roster stays read-only here. In the full workspace, that same roster can be edited directly from Admin."}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {snapshot.staffDirectory.map((user) => (
              (() => {
                const isCurrentUser = user.id === currentUser.id;
                const isLastActiveAdmin =
                  user.role === "operations_admin" &&
                  user.status === "active" &&
                  activeAdminCount <= 1;
                const canDeleteUser = !isCurrentUser && !isLastActiveAdmin;

                return (
                  <div
                    key={user.id}
                    className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {user.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                          {translateWorkspaceRole(user.role, language)}
                        </p>
                        {isCurrentUser ? (
                          <p className="mt-2 text-xs leading-5 text-[#4F57E8]">
                            {isPolish
                              ? "To jest Twoje bieżące konto admina. Nazwę możesz zmienić tutaj, ale email, rolę i dostęp zmieniaj z innej aktywnej sesji administratora."
                              : "This is your current admin account. You can update the display name here, but change email, role, or access from another active admin session."}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStaffStatusClassName(
                          user.status
                        )}`}
                      >
                        {translateWorkspaceUserStatus(user.status, language)}
                      </span>
                    </div>

                    {snapshot.staffDirectorySource === "database" ? (
                      <form
                        action={updateWorkspaceStaffMemberAction}
                        className="mt-4 grid gap-3 border-t border-slate-100/80 pt-4"
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        {isCurrentUser ? (
                          <>
                            <input type="hidden" name="role" value={user.role} />
                            <input type="hidden" name="status" value={user.status} />
                          </>
                        ) : null}

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {isPolish ? "Imię i nazwisko" : "Full name"}
                            </span>
                            <input
                              type="text"
                              name="name"
                              defaultValue={user.name}
                              className={dashboardInputClassName}
                              required
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {isPolish ? "Email" : "Email"}
                            </span>
                            <input
                              type="email"
                              name="email"
                              defaultValue={user.email}
                              readOnly={isCurrentUser}
                              className={`${dashboardInputClassName} ${
                                isCurrentUser ? "cursor-not-allowed opacity-70" : ""
                              }`}
                              required
                            />
                          </label>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {isPolish ? "Rola" : "Role"}
                            </span>
                            <select
                              {...(isCurrentUser
                                ? {}
                                : { name: "role" })}
                              defaultValue={user.role}
                              disabled={isCurrentUser}
                              className={`${dashboardInputClassName} ${
                                isCurrentUser ? "cursor-not-allowed opacity-70" : ""
                              }`}
                            >
                              {editableWorkspaceRoles.map((role) => (
                                <option key={role} value={role}>
                                  {translateWorkspaceRole(role, language)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {isPolish ? "Status" : "Status"}
                            </span>
                            <select
                              {...(isCurrentUser
                                ? {}
                                : { name: "status" })}
                              defaultValue={user.status}
                              disabled={isCurrentUser}
                              className={`${dashboardInputClassName} ${
                                isCurrentUser ? "cursor-not-allowed opacity-70" : ""
                              }`}
                            >
                              {editableWorkspaceStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {translateWorkspaceUserStatus(status, language)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="flex flex-wrap justify-end gap-3">
                          <button
                            type="submit"
                            className={dashboardGhostButtonClassName}
                          >
                            {isPolish ? "Zapisz zmiany" : "Save changes"}
                          </button>
                          <button
                            type="submit"
                            formAction={deleteWorkspaceStaffMemberAction}
                            formNoValidate
                            disabled={!canDeleteUser}
                            className={
                              canDeleteUser
                                ? adminDangerButtonClassName
                                : disabledAdminDangerButtonClassName
                            }
                          >
                            {isPolish ? "Usuń użytkownika" : "Remove user"}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                );
              })()
            ))}
          </div>

          {snapshot.staffDirectorySource === "database" ? (
            <form
              action={createWorkspaceStaffMemberAction}
              className="mt-6 rounded-[24px] border border-white/75 bg-slate-50/70 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.08)]"
            >
              <p className="text-sm font-semibold text-slate-900">
                {isPolish ? "Dodaj członka zespołu" : "Add staff member"}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {isPolish ? "Imię i nazwisko" : "Full name"}
                  </span>
                  <input
                    type="text"
                    name="name"
                    className={dashboardInputClassName}
                    placeholder={isPolish ? "Alex Morgan" : "Alex Morgan"}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {isPolish ? "Email" : "Email"}
                  </span>
                  <input
                    type="email"
                    name="email"
                    className={dashboardInputClassName}
                    placeholder="staff@university.edu"
                    required
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {isPolish ? "Rola" : "Role"}
                  </span>
                  <select
                    name="role"
                    defaultValue="triage_specialist"
                    className={dashboardInputClassName}
                  >
                    {editableWorkspaceRoles.map((role) => (
                      <option key={role} value={role}>
                        {translateWorkspaceRole(role, language)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {isPolish ? "Status" : "Status"}
                  </span>
                  <select
                    name="status"
                    defaultValue="active"
                    className={dashboardInputClassName}
                  >
                    {editableWorkspaceStatuses.map((status) => (
                      <option key={status} value={status}>
                        {translateWorkspaceUserStatus(status, language)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex justify-end">
                <button type="submit" className={dashboardPrimaryButtonClassName}>
                  {isPolish ? "Dodaj użytkownika" : "Add user"}
                </button>
              </div>
            </form>
          ) : null}
        </article>

        <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {hasRemoteLocations
              ? isPolish
                ? "Zarządzanie workspace"
                : "Workspace stewardship"
              : isPolish
                ? "Zarządzanie workspace"
                : "Workspace stewardship"}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1E2340]">
            {hasRemoteLocations
              ? isPolish
                ? "Ślad operacyjny"
                : "Operational footprint"
              : isPolish
                ? "Ślad operacyjny"
                : "Operational footprint"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isPolish
              ? "Zachowaj lekki obraz tego, jak dużo materiału workspace aktualnie śledzi. Głębsze szczegóły środowiska pozostają schowane, dopóki naprawdę nie są potrzebne."
              : "Keep a light view of how much material the workspace is currently tracking. Deeper environment details stay tucked away until they are genuinely needed."}
          </p>

          {hasRemoteLocations || localWritableRootIsTemporary ? (
            <div className="mt-5 rounded-[22px] border border-[#DCE1FF] bg-[#F7F8FF] px-4 py-4 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-[#1E2340]">
                {isPolish ? "Jak czytać tę sekcję" : "How to read this section"}
              </p>
              <p className="mt-2">
                {isPolish
                  ? "Sprawy, historia aktywności i dokumenty są już utrzymywane dla tego workspace. Otwórz szczegóły zaawansowane tylko wtedy, gdy ktoś zapyta o konkretne środowisko lub ścieżki zapisu."
                  : "Cases, activity history, and documents are already being maintained for this workspace. Open the advanced details only if someone asks about a specific environment or storage path."}
              </p>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] bg-slate-50/85 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {hasRemoteLocations
                  ? isPolish
                    ? "Śledzony rozmiar workspace"
                    : "Tracked workspace size"
                  : isPolish
                    ? "Śledzony rozmiar workspace"
                    : "Tracked workspace size"}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatStorageBytes(snapshot.localStorage.totalTrackedBytes, locale)}
              </p>
            </div>
            <div className="rounded-[20px] bg-slate-50/85 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {hasRemoteLocations
                  ? isPolish
                    ? "Śledzone pliki"
                    : "Tracked files"
                  : isPolish
                    ? "Śledzone pliki"
                    : "Tracked files"}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {snapshot.localStorage.totalTrackedFiles.toLocaleString(locale)}
              </p>
            </div>
          </div>

          <details className="mt-4 rounded-[22px] border border-white/75 bg-white/62 shadow-[0_14px_32px_rgba(141,153,179,0.12)]">
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-900">
              {isPolish
                ? "Zaawansowane szczegóły środowiska"
                : "Advanced environment details"}
            </summary>

            <div className="border-t border-slate-100/80 px-4 py-4">
              <div className="rounded-[22px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(141,153,179,0.12)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Lokalny katalog roboczy" : "Local Writable Root"}
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
                              {getStorageKindLabel(location.kind, language)}
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
                            {isRemoteStorageKind(location.kind)
                              ? isPolish
                                ? "Pomiar lokalny"
                                : "Local Measurement"
                              : isPolish
                                ? "Rozmiar"
                                : "Size"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {isRemoteStorageKind(location.kind)
                              ? isPolish
                                ? "Nie mierzymy"
                                : "Not Measured"
                              : formatStorageBytes(location.approxSizeBytes, locale)}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {isRemoteStorageKind(location.kind)
                              ? isPolish
                                ? "Liczba obiektów"
                                : "Object Count"
                              : isPolish
                                ? "Pliki"
                                : "Files"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {isRemoteStorageKind(location.kind)
                              ? isPolish
                                ? "Nie śledzimy"
                                : "Not Tracked"
                              : location.fileCount.toLocaleString(locale)}
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
            </div>
          </details>
        </article>
      </section>
    </>
  );
}
