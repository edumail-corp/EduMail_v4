import Link from "next/link";
import { DashboardAvatar, dashboardPanelClassName } from "@/components/dashboard/dashboard-chrome";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";
import { EmailStatusBadge } from "@/components/dashboard/email-badges";
import {
  getEmailDepartment,
  translateDepartment,
  type StaffEmail,
} from "@/lib/email-data";

function getMessagePreview(email: StaffEmail) {
  return email.body.replace(/\s+/g, " ").trim();
}

export function InboxEmailList({
  emails,
  selectedId,
  onSelect,
  emptyMessage,
  emptyActionHref,
  emptyActionLabel,
}: Readonly<{
  emails: StaffEmail[];
  selectedId: string;
  onSelect: (id: string) => void;
  emptyMessage: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
}>) {
  const { formatDateTime, preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";
  const isCompact = preferences.inboxDensity === "compact";

  return (
    <section className={`${dashboardPanelClassName} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-white/70 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {isPolish ? "Wiadomości" : "Messages"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {isPolish
              ? "Otwórz wiadomość, aby przejrzeć sugerowaną odpowiedź."
              : "Open a message to review the suggested reply."}
          </p>
        </div>
        <span className="rounded-full bg-[#F3F5FF] px-3 py-1 text-xs font-semibold text-[#4F57E8]">
          {emails.length}
        </span>
      </div>

      {emails.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-slate-500">
          <p>{emptyMessage}</p>
          {emptyActionHref && emptyActionLabel ? (
            <Link
              href={emptyActionHref}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-white/80 bg-white/86 px-4 py-2.5 text-sm font-semibold text-[#4F57E8] shadow-[0_14px_30px_rgba(141,156,186,0.12)] transition hover:bg-white"
            >
              {emptyActionLabel}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="max-h-[calc(100vh-15rem)] overflow-y-auto px-3 py-3">
          <div className={isCompact ? "space-y-2" : "space-y-2.5"}>
            {emails.map((email) => {
              const senderName = email.sender.split(" <")[0] ?? email.sender;
              const isSelected = email.id === selectedId;
              const department = getEmailDepartment(email);
              const hasDraft = Boolean(email.aiDraft);

              return (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => onSelect(email.id)}
                  className={`w-full rounded-[24px] border px-4 text-left transition ${
                    isCompact ? "py-3" : "py-4"
                  } ${
                    isSelected
                      ? "border-[#C7CEFF] bg-[#F7F8FF] shadow-[0_18px_42px_rgba(120,129,255,0.16)]"
                      : "border-transparent bg-white/68 hover:border-white/80 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <DashboardAvatar
                      name={senderName}
                      className="mt-0.5 h-11 w-11 shrink-0 text-[10px]"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {senderName}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-[#1E2340]">
                            {email.subject}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-400">
                          {formatDateTime(email.receivedAt)}
                        </span>
                      </div>

                      <p
                        className={`mt-2 text-sm text-slate-500 ${
                          isCompact ? "line-clamp-1 leading-5" : "line-clamp-2 leading-6"
                        }`}
                      >
                        {getMessagePreview(email)}
                      </p>

                      <div className={`flex flex-wrap items-center gap-2 ${isCompact ? "mt-2" : "mt-3"}`}>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {translateDepartment(department, preferences.language)}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          {hasDraft
                            ? isPolish
                              ? "Sugerowana odpowiedź gotowa"
                              : "Suggested reply ready"
                            : isPolish
                              ? "Wymaga odpowiedzi"
                              : "Needs reply"}
                        </span>
                        {email.status !== "Draft" ? (
                          <EmailStatusBadge status={email.status} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
