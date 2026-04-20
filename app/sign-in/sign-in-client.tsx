"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  DashboardIcon,
  dashboardInputClassName,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser-client";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";
import { translateWorkspaceRole, type WorkspaceRole } from "@/lib/workspace-config";

type SignInErrorCode =
  | "auth-failed"
  | "not-authorized"
  | "config-missing";

type WorkspaceOAuthProvider = "google" | "azure";
type DevelopmentAccessUser = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
};

type SsoProviderDefinition = {
  provider: WorkspaceOAuthProvider;
  className: string;
  label: {
    English: string;
    Polish: string;
  };
};

const ssoProviderDefinitions: readonly SsoProviderDefinition[] = [
  {
    provider: "google",
    className: dashboardPrimaryButtonClassName,
    label: {
      English: "Google",
      Polish: "Google",
    },
  },
  {
    provider: "azure",
    className: dashboardSecondaryButtonClassName,
    label: {
      English: "Microsoft",
      Polish: "Microsoft",
    },
  },
] as const;

function getErrorMessage(
  code: string | null,
  isPolish: boolean
) {
  const normalizedCode = code as SignInErrorCode | null;

  if (normalizedCode === "not-authorized") {
    return isPolish
      ? "To jest workspace tylko dla zatwierdzonych kont pracowników z katalogu zespołu."
      : "This workspace is limited to approved staff accounts from the team directory.";
  }

  if (normalizedCode === "config-missing") {
    return isPolish
      ? "Supabase Auth nie jest jeszcze skonfigurowany w tym środowisku."
      : "Supabase Auth is not configured in this environment yet.";
  }

  if (normalizedCode === "auth-failed") {
    return isPolish
      ? "Nie udało się dokończyć logowania. Spróbuj ponownie."
      : "We could not finish sign-in. Please try again.";
  }

  return null;
}

function getSuccessMessage(
  value: string | null,
  isPolish: boolean
) {
  if (value !== "magic-link-sent") {
    return null;
  }

  return isPolish
    ? "Wysłaliśmy link logowania. Otwórz wiadomość email na zatwierdzonym koncie pracownika."
    : "We sent a sign-in link. Open the email from an approved staff account.";
}

function sanitizeClientRedirectPath(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function getProviderLabel(
  provider: WorkspaceOAuthProvider,
  isPolish: boolean
) {
  const providerDefinition = ssoProviderDefinitions.find(
    (candidate) => candidate.provider === provider
  );

  if (!providerDefinition) {
    return "SSO";
  }

  return isPolish
    ? providerDefinition.label.Polish
    : providerDefinition.label.English;
}

export function SignInClient({
  authConfigured,
  developmentAccessEnabled,
  developmentAccessUsers,
  errorCode,
  nextPath,
  status,
}: Readonly<{
  authConfigured: boolean;
  developmentAccessEnabled: boolean;
  developmentAccessUsers: readonly DevelopmentAccessUser[];
  errorCode: string | null;
  nextPath: string;
  status: string | null;
}>) {
  const { preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";
  const safeNextPath = sanitizeClientRedirectPath(nextPath);
  const errorMessage = getErrorMessage(errorCode, isPolish);
  const successMessage = getSuccessMessage(status, isPolish);
  const [email, setEmail] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const showBuiltInWorkspaceAccess =
    developmentAccessEnabled && developmentAccessUsers.length > 0;
  const shouldPrioritizeBuiltInAccess = showBuiltInWorkspaceAccess && !authConfigured;
  const builtInAccessButtonClassName = shouldPrioritizeBuiltInAccess
    ? dashboardPrimaryButtonClassName
    : dashboardSecondaryButtonClassName;
  const builtInAccessTitleClassName = shouldPrioritizeBuiltInAccess
    ? "block truncate text-sm font-semibold text-white"
    : "block truncate text-sm font-semibold text-slate-900";
  const builtInAccessRoleClassName = shouldPrioritizeBuiltInAccess
    ? "mt-1 block truncate text-xs font-medium text-white/80"
    : "mt-1 block truncate text-xs font-medium text-slate-500";
  const builtInAccessEmailClassName = shouldPrioritizeBuiltInAccess
    ? "mt-1 block truncate text-xs text-white/70"
    : "mt-1 block truncate text-xs text-slate-400";
  const accessNoticeTitle = shouldPrioritizeBuiltInAccess
    ? isPolish
      ? "Wbudowany dostęp do workspace"
      : "Built-in workspace access"
    : isPolish
      ? "Lokalny dostęp developerski"
      : "Local developer access";
  const accessNoticeDescription = shouldPrioritizeBuiltInAccess
    ? isPolish
      ? "Supabase Auth nie jest jeszcze skonfigurowany w tym środowisku, więc możesz wejść do workspace jako zatwierdzony pracownik z bieżącego katalogu."
      : "Supabase Auth is not configured in this environment yet, so you can still enter the workspace as an approved staff member from the current directory."
    : isPolish
      ? "Jeśli zewnętrzne logowanie nie jest jeszcze gotowe, możesz wejść do workspace jako członek zespołu z bieżącego katalogu."
      : "If external sign-in is not ready yet, you can enter the workspace as a staff member from the current directory.";

  function buildCallbackUrl() {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", safeNextPath);
    return callbackUrl.toString();
  }

  async function handleOAuthSignIn(provider: WorkspaceOAuthProvider) {
    setInlineError(null);
    setInlineMessage(null);
    setIsBusy(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: buildCallbackUrl(),
          ...(provider === "azure" ? { scopes: "email" } : {}),
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error(
        isPolish
          ? "Nie udało się uzyskać adresu przekierowania logowania."
          : "The sign-in redirect URL was not returned."
      );
    } catch (error) {
      const providerLabel = getProviderLabel(provider, isPolish);
      setInlineError(
        error instanceof Error
          ? error.message
          : isPolish
            ? `Nie udało się rozpocząć logowania przez ${providerLabel}.`
            : `Unable to start ${providerLabel} sign-in.`
      );
      setIsBusy(false);
    }
  }

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInlineError(null);
    setInlineMessage(null);
    setIsBusy(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: buildCallbackUrl(),
        },
      });

      if (error) {
        throw error;
      }

      setInlineMessage(
        isPolish
          ? "Link logowania został wysłany. Użyj zatwierdzonego konta pracownika."
          : "The sign-in link was sent. Use an approved staff account."
      );
      setEmail("");
    } catch (error) {
      setInlineError(
        error instanceof Error
          ? error.message
          : isPolish
            ? "Nie udało się wysłać linku logowania."
            : "Unable to send the sign-in link."
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(120,129,255,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(179,221,255,0.26),_transparent_30%),linear-gradient(180deg,#f3f5fc_0%,#f6f8fd_42%,#f7f8fd_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.82fr)]">
          <section className={`${dashboardPanelClassName} p-8 md:p-10`}>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#4F57E8] shadow-[0_12px_30px_rgba(142,155,182,0.12)]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#EEF0FF] text-[#5C61FF]">
                <DashboardIcon name="users" className="h-4 w-4" />
              </span>
              {isPolish ? "Dostęp pracowników" : "Staff Access"}
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              {shouldPrioritizeBuiltInAccess
                ? isPolish
                  ? "Wejdź do EduMailAI przez wbudowany dostęp pracowników."
                  : "Enter EduMailAI through built-in staff access."
                : isPolish
                  ? "Zaloguj zespół do EduMailAI przez Supabase Auth."
                  : "Sign your team into EduMailAI through Supabase Auth."}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              {shouldPrioritizeBuiltInAccess
                ? isPolish
                  ? "To środowisko nadal korzysta z repozytoryjnego katalogu pracowników jako ścieżki wejścia. Wybierz zatwierdzony profil poniżej, aby przejść dalej do /dashboard."
                  : "This environment is still using the repo-backed staff directory as the entry path. Choose an approved staff profile below to continue into /dashboard."
                : isPolish
                  ? "Pierwsze wdrożenie ogranicza dostęp do zatwierdzonego katalogu pracowników. Zaloguj się przez Google lub Microsoft albo poproś o magic link wysłany na konto z allowlisty."
                  : "This first rollout is limited to the approved staff directory. Sign in with Google or Microsoft, or request a magic link sent to an allowlisted account."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className={dashboardSecondaryButtonClassName}>
                {isPolish ? "Wróć do strony głównej" : "Back to Home"}
              </Link>
              <span className="inline-flex items-center rounded-full border border-white/80 bg-white/82 px-4 py-3 text-sm font-semibold text-slate-500 shadow-[0_14px_38px_rgba(141,156,186,0.14)]">
                {isPolish ? "Po zalogowaniu wejdziesz do /dashboard" : "After sign-in you will land in /dashboard"}
              </span>
            </div>
          </section>

          <aside className={`${dashboardPanelClassName} p-6 md:p-8`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {isPolish ? "Logowanie" : "Sign In"}
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#1E2340]">
              {isPolish ? "Wybierz metodę dostępu" : "Choose an access method"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {isPolish
                ? "Google i Microsoft są głównymi ścieżkami SSO, a magic link pozostaje zapasową opcją dla zatwierdzonych kont pracowników."
                : "Google and Microsoft are the primary SSO paths, while magic link remains the fallback for approved staff accounts."}
            </p>

            {showBuiltInWorkspaceAccess ? (
              <div className="mt-5 rounded-[24px] border border-[#DCE1FF] bg-[#F7F8FF] px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
                <p className="font-semibold text-[#1E2340]">
                  {accessNoticeTitle}
                </p>
                <p className="mt-2">{accessNoticeDescription}</p>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-5 rounded-[24px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C] shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-5 rounded-[24px] border border-[#C7F0D6] bg-[#F0FBF4] px-4 py-3 text-sm text-[#19754C] shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
                {successMessage}
              </div>
            ) : null}

            {!authConfigured && !shouldPrioritizeBuiltInAccess ? (
              <div className="mt-5 rounded-[24px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C] shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
                {isPolish
                  ? "Dodaj NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY, aby włączyć logowanie."
                  : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in."}
              </div>
            ) : null}

            {inlineError ? (
              <div className="mt-5 rounded-[24px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C] shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
                {inlineError}
              </div>
            ) : null}

            {inlineMessage ? (
              <div className="mt-5 rounded-[24px] border border-[#C7F0D6] bg-[#F0FBF4] px-4 py-3 text-sm text-[#19754C] shadow-[0_14px_36px_rgba(141,153,179,0.12)]">
                {inlineMessage}
              </div>
            ) : null}

            {authConfigured ? (
              <>
                <div className="mt-6 grid gap-3">
                  {ssoProviderDefinitions.map((providerDefinition) => {
                    const providerLabel = isPolish
                      ? providerDefinition.label.Polish
                      : providerDefinition.label.English;

                    return (
                      <button
                        key={providerDefinition.provider}
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void handleOAuthSignIn(providerDefinition.provider);
                        }}
                        className={`${providerDefinition.className} w-full gap-3 disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <DashboardIcon name="users" className="h-[18px] w-[18px]" />
                        {isPolish
                          ? `Kontynuuj przez ${providerLabel}`
                          : `Continue with ${providerLabel}`}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  {isPolish ? "albo magic link" : "or magic link"}
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleMagicLink}>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {isPolish ? "Email pracownika" : "Staff email"}
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={isPolish ? "pracownik@uczelnia.edu" : "staff@university.edu"}
                      className={dashboardInputClassName}
                      autoComplete="email"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isBusy || email.trim().length === 0}
                    className={`${dashboardSecondaryButtonClassName} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {isPolish ? "Wyślij link logowania" : "Send sign-in link"}
                  </button>
                </form>
              </>
            ) : null}

            {showBuiltInWorkspaceAccess ? (
              <>
                <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  {authConfigured
                    ? isPolish
                      ? "albo dostęp lokalny"
                      : "or local access"
                    : isPolish
                      ? "wejdź do workspace"
                      : "enter the workspace"}
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <form action="/auth/dev-sign-in" method="post" className="mt-6 space-y-3">
                  <input type="hidden" name="next" value={safeNextPath} />

                  {developmentAccessUsers.map((user) => (
                    <button
                      key={user.id}
                      type="submit"
                      name="userId"
                      value={user.id}
                      className={`w-full items-start justify-between gap-4 rounded-[22px] px-4 py-4 text-left ${builtInAccessButtonClassName}`}
                    >
                      <span className="min-w-0">
                        <span className={builtInAccessTitleClassName}>
                          {isPolish
                            ? `Wejdź jako ${user.name}`
                            : `Continue as ${user.name}`}
                        </span>
                        <span className={builtInAccessRoleClassName}>
                          {translateWorkspaceRole(user.role, preferences.language)}
                        </span>
                        <span className={builtInAccessEmailClassName}>
                          {user.email}
                        </span>
                      </span>
                      <span className="shrink-0 text-current">
                        <DashboardIcon name="shield" className="h-5 w-5" />
                      </span>
                    </button>
                  ))}
                </form>
              </>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
