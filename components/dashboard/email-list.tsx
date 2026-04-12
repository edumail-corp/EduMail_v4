import Link from "next/link";
import {
  approvalStateClasses,
  emailPriorityClasses,
  formatEmailDate,
  groundingStrengthClasses,
} from "@/lib/dashboard";
import {
  assessEmailGrounding,
  getEmailAssignmentRecommendation,
  getEmailApprovalState,
  getEmailDepartment,
  type MailboxOperationsSnapshot,
  type StaffEmail,
} from "@/lib/email-data";
import {
  DashboardAvatar,
  dashboardPanelClassName,
} from "@/components/dashboard/dashboard-chrome";
import {
  EmailCategoryBadge,
  EmailStatusBadge,
} from "@/components/dashboard/email-badges";

export function EmailList({
  title,
  description,
  emails,
  operationsSnapshot,
  selectedId,
  onSelect,
  emptyMessage,
  emptyActionHref,
  emptyActionLabel,
}: Readonly<{
  title: string;
  description: string;
  emails: StaffEmail[];
  operationsSnapshot?: MailboxOperationsSnapshot;
  selectedId: string;
  onSelect: (id: string) => void;
  emptyMessage: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
}>) {
  const queueSnapshot = operationsSnapshot;

  return (
    <section className={`${dashboardPanelClassName} overflow-hidden p-5 md:p-6`}>
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      {emails.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-white/70 bg-white/55 px-6 py-16 text-center text-sm text-slate-500">
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
        <div className="max-h-[calc(100vh-19rem)] space-y-3 overflow-y-auto pr-1">
          {emails.map((email) => {
            const isSelected = email.id === selectedId;
            const senderName = email.sender.split(" <")[0] ?? email.sender;
            const department = getEmailDepartment(email);
            const approvalState = getEmailApprovalState(email);
            const groundingAssessment = assessEmailGrounding(email);
            const assignmentRecommendation = queueSnapshot
              ? getEmailAssignmentRecommendation(email, queueSnapshot)
              : null;
            const footerActionLabel =
              email.status === "Auto-sent"
                ? "View Sent Reply"
                : email.status === "Escalated"
                  ? "Review Escalation"
                  : email.assignee
                    ? `Review ${department}`
                    : `Claim ${department}`;
            const citationMetaLabel =
              email.sourceCitations.length > 0
                ? `${email.sourceCitations.length} citations`
                : email.source
                  ? "Source linked"
                  : "No citations yet";

            return (
              <button
                key={email.id}
                type="button"
                onClick={() => onSelect(email.id)}
                className={`w-full rounded-[28px] border p-5 text-left transition ${
                  isSelected
                    ? "border-[#C7CEFF] bg-[#F7F8FF] shadow-[0_20px_48px_rgba(120,129,255,0.18)]"
                    : "border-white/70 bg-white/62 hover:border-white hover:bg-white/82"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3.5">
                    <DashboardAvatar
                      name={senderName}
                      className="h-12 w-12 shrink-0 text-[10px]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-tight text-[#1E2340]">
                        {senderName}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {department}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-400 shadow-[0_12px_24px_rgba(144,156,182,0.12)]">
                    {formatEmailDate(email.receivedAt)}
                  </span>
                </div>

                <p className="mt-5 text-xl font-semibold tracking-tight text-[#1E2340]">
                  {email.subject}
                </p>

                <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">
                  {email.summary}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <EmailStatusBadge status={email.status} />
                  <EmailCategoryBadge category={email.category} />
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${approvalStateClasses[approvalState]}`}
                  >
                    {approvalState}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${emailPriorityClasses[email.priority]}`}
                  >
                    {email.priority} Priority
                  </span>
                  {email.routingDecision ? (
                    <span className="rounded-full bg-white/86 px-2.5 py-1 text-xs font-semibold text-slate-500">
                      {email.routingDecision.confidence} routing •{" "}
                      {email.routingDecision.confidenceScore}%
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${groundingStrengthClasses[groundingAssessment.strength]}`}
                  >
                    {groundingAssessment.strength} support
                  </span>
                  {email.source ? (
                    <span className="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-xs font-semibold text-[#5C61FF]">
                      {email.source}
                    </span>
                  ) : null}
                </div>

                {email.routingDecision ? (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {email.routingDecision.reason}
                  </p>
                ) : null}

                {email.manualReviewReason ? (
                  <p className="mt-3 text-sm leading-6 text-[#B4375C]">
                    {email.manualReviewReason}
                  </p>
                ) : null}

                {email.routingDecision?.suggestedAssignees.length ? (
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                    Suggested owners: {email.routingDecision.suggestedAssignees.join(", ")}
                  </p>
                ) : null}
                {assignmentRecommendation ? (
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-[#4F57E8]">
                    {email.assignee === assignmentRecommendation.assignee
                      ? `Best-fit owner: ${assignmentRecommendation.assignee}`
                      : `Rebalance suggestion: ${assignmentRecommendation.assignee}`}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      {email.assignee
                        ? `Assigned to ${email.assignee}`
                        : "Unassigned"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Updated {formatEmailDate(email.lastUpdatedAt)}</span>
                    <span className="text-slate-300">•</span>
                    <span>{citationMetaLabel}</span>
                    {assignmentRecommendation ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{assignmentRecommendation.queueSummary}</span>
                      </>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-white/78 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5C61FF] shadow-[0_12px_24px_rgba(144,156,182,0.12)]">
                    {footerActionLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
