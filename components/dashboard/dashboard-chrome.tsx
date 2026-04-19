import type { ReactNode, SVGProps } from "react";

export type DashboardIconName =
  | "overview"
  | "inbox"
  | "drafts"
  | "knowledge"
  | "settings"
  | "compose"
  | "search"
  | "notification"
  | "document"
  | "upload"
  | "download"
  | "shield"
  | "clock"
  | "sparkles"
  | "users"
  | "trend"
  | "database"
  | "warning"
  | "mail";

export const dashboardPanelClassName =
  "dashboard-panel rounded-[30px] border border-white/75 bg-white/76 shadow-[0_24px_70px_rgba(137,152,181,0.18)] backdrop-blur-xl";

export const dashboardSubtlePanelClassName =
  "dashboard-subtle-panel rounded-[24px] border border-white/70 bg-white/58 shadow-[0_16px_40px_rgba(141,156,186,0.12)] backdrop-blur-xl";

export const dashboardInputClassName =
  "dashboard-input w-full rounded-full border border-white/75 bg-white/86 px-5 py-3.5 text-sm text-slate-700 shadow-[0_14px_38px_rgba(140,153,179,0.16)] outline-none transition placeholder:text-slate-400 focus:border-[#6A6CFF]/35 focus:bg-white";

export const dashboardPrimaryButtonClassName =
  "dashboard-primary-button inline-flex items-center justify-center rounded-full bg-[#5C61FF] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(92,97,255,0.28)] transition hover:bg-[#4E54F6]";

export const dashboardSecondaryButtonClassName =
  "dashboard-secondary-button inline-flex items-center justify-center rounded-full border border-white/80 bg-white/82 px-5 py-3 text-sm font-semibold text-[#4F57E8] shadow-[0_14px_38px_rgba(141,156,186,0.14)] transition hover:bg-white";

export const dashboardGhostButtonClassName =
  "dashboard-ghost-button inline-flex items-center justify-center rounded-full border border-[#5C61FF]/12 bg-[#F3F4FF] px-4 py-2.5 text-sm font-semibold text-[#4F57E8] transition hover:bg-[#ECEEFF]";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getAvatarPalette(name: string) {
  const palettes = [
    "from-[#5C61FF] via-[#6E79FF] to-[#86D8FF]",
    "from-[#4F46E5] via-[#7C3AED] to-[#A78BFA]",
    "from-[#2563EB] via-[#60A5FA] to-[#BAE6FD]",
    "from-[#0F766E] via-[#14B8A6] to-[#67E8F9]",
  ] as const;

  const hash = [...name].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return palettes[hash % palettes.length];
}

function getInitials(name: string) {
  const parts = name
    .split(/[<@]/)[0]
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DashboardAvatar({
  name,
  className,
  label,
}: Readonly<{
  name: string;
  className?: string;
  label?: string;
}>) {
  const initials = label ?? getInitials(name);

  return (
    <div
      className={joinClasses(
        "grid place-items-center rounded-full bg-gradient-to-br text-[11px] font-semibold tracking-[0.18em] text-white shadow-[0_12px_28px_rgba(118,134,164,0.24)]",
        getAvatarPalette(name),
        className
      )}
    >
      {initials}
    </div>
  );
}

export function DashboardIcon({
  name,
  className,
  ...props
}: Readonly<{
  name: DashboardIconName;
  className?: string;
}> &
  SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={joinClasses("h-5 w-5", className)}
      {...props}
    >
      {name === "overview" ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      ) : null}
      {name === "inbox" ? (
        <>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
          <path d="M4 13h4l1.5 2h5L16 13h4" />
        </>
      ) : null}
      {name === "drafts" ? (
        <>
          <path d="M4 18.5V20h1.5L17 8.5 15.5 7z" />
          <path d="M14 4.5 16 2.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2l-2 2" />
          <path d="M4 13V5.8A1.8 1.8 0 0 1 5.8 4h8.7" />
        </>
      ) : null}
      {name === "knowledge" ? (
        <>
          <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h5v15H7a2.5 2.5 0 0 0-2.5 2.5" />
          <path d="M19.5 5.5A2.5 2.5 0 0 0 17 3h-5v15h5a2.5 2.5 0 0 1 2.5 2.5" />
        </>
      ) : null}
      {name === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.5 12a1.8 1.8 0 0 0 .04.37l1.9 1.49-1.8 3.12-2.27-.62a7 7 0 0 1-.64.37l-.34 2.32h-3.6l-.34-2.32a7 7 0 0 1-.64-.37l-2.27.62-1.8-3.12 1.9-1.49A1.8 1.8 0 0 0 4.5 12c0-.13.01-.25.04-.37l-1.9-1.49 1.8-3.12 2.27.62c.2-.14.41-.26.64-.37l.34-2.32h3.6l.34 2.32c.23.11.44.23.64.37l2.27-.62 1.8 3.12-1.9 1.49c.03.12.04.24.04.37Z" />
        </>
      ) : null}
      {name === "compose" ? (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      ) : null}
      {name === "search" ? (
        <>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </>
      ) : null}
      {name === "notification" ? (
        <>
          <path d="M6.5 16.5h11l-1.2-1.8a3.5 3.5 0 0 1-.6-2V10a3.7 3.7 0 1 0-7.4 0v2.7a3.5 3.5 0 0 1-.6 2z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </>
      ) : null}
      {name === "document" ? (
        <>
          <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" />
          <path d="M14 3.5V8h4" />
        </>
      ) : null}
      {name === "upload" ? (
        <>
          <path d="M12 16V5" />
          <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
          <path d="M5 18.5A1.5 1.5 0 0 0 6.5 20h11A1.5 1.5 0 0 0 19 18.5" />
        </>
      ) : null}
      {name === "download" ? (
        <>
          <path d="M12 5v11" />
          <path d="m7.5 12.5 4.5 4.5 4.5-4.5" />
          <path d="M5 18.5A1.5 1.5 0 0 0 6.5 20h11A1.5 1.5 0 0 0 19 18.5" />
        </>
      ) : null}
      {name === "shield" ? (
        <>
          <path d="M12 3.5 5.5 6v5.2c0 4 2.8 7.7 6.5 9.3 3.7-1.6 6.5-5.3 6.5-9.3V6z" />
          <path d="m9.4 11.9 1.7 1.7 3.7-3.7" />
        </>
      ) : null}
      {name === "clock" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5l3 1.8" />
        </>
      ) : null}
      {name === "sparkles" ? (
        <>
          <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3Z" />
          <path d="m18.5 14 0.8 2.2 2.2 0.8-2.2 0.8-0.8 2.2-0.8-2.2-2.2-0.8 2.2-0.8Z" />
          <path d="m5.5 14 0.7 1.8 1.8 0.7-1.8 0.7-0.7 1.8-0.7-1.8-1.8-0.7 1.8-0.7Z" />
        </>
      ) : null}
      {name === "users" ? (
        <>
          <path d="M16.5 19v-1.2a3.3 3.3 0 0 0-3.3-3.3H8.8a3.3 3.3 0 0 0-3.3 3.3V19" />
          <circle cx="11" cy="8" r="3" />
          <path d="M18 9.2a2.5 2.5 0 0 1 0 4.8" />
          <path d="M20 19v-1.1a2.8 2.8 0 0 0-2.3-2.7" />
        </>
      ) : null}
      {name === "trend" ? (
        <>
          <path d="M4 17 9 12l3 3 7-8" />
          <path d="M14 7h5v5" />
        </>
      ) : null}
      {name === "database" ? (
        <>
          <ellipse cx="12" cy="6" rx="6.5" ry="2.8" />
          <path d="M5.5 6v6c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8V6" />
          <path d="M5.5 12v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5" />
        </>
      ) : null}
      {name === "warning" ? (
        <>
          <path d="M12 4 4 18h16z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="15.5" r=".7" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {name === "mail" ? (
        <>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.3" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </>
      ) : null}
    </svg>
  );
}

export function DashboardInset({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={joinClasses(
        dashboardSubtlePanelClassName,
        "p-4 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
