import Link from "next/link";
import type { ReactNode } from "react";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";
import {
  assessEmailGrounding,
  type AssignmentRecommendation,
  type DepartmentQueueSummary,
  defaultStaffAssignmentSelection,
  getEmailApprovalState,
  getEmailApprovalGuidance,
  getEmailDepartment,
  groupEmailSourceCitations,
  staffAssigneeOptions as defaultStaffAssigneeOptions,
  translateCaseApprovalState,
  translateDepartment,
  translateEmailPriority,
  translateGroundingStrength,
  translateRoutingConfidence,
  translateStaffAssignmentSelectValue,
  translateWorkloadPressure,
  type StaffAssignmentSelectValue,
  type StaffEmail,
} from "@/lib/email-data";
import {
  getLocalizedRoutingDecisionReason,
  getLocalizedRoutingSignalList,
} from "@/lib/local-routing";
import {
  DashboardAvatar,
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { EmailStatusBadge } from "@/components/dashboard/email-badges";
import {
  approvalStateClasses,
  emailPriorityClasses,
  groundingStrengthClasses,
  workloadPressureClasses,
} from "@/lib/dashboard";

const disabledPrimaryButtonClassName =
  "inline-flex items-center justify-center rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500";

const disabledSecondaryButtonClassName =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400";

function DetailCard({
  title,
  subtitle,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
}>) {
  return (
    <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1E2340]">{title}</p>
          {subtitle ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </article>
  );
}

function getGroundingBarClassName(strength: string) {
  if (strength === "Strong") {
    return "bg-gradient-to-r from-[#37B77F] to-[#0C8A53]";
  }

  if (strength === "Moderate") {
    return "bg-gradient-to-r from-[#F3B552] to-[#B76B13]";
  }

  return "bg-gradient-to-r from-[#F78AA3] to-[#D43D63]";
}

export function EmailDetailPanel({
  email,
  assignmentRecommendation,
  departmentSummary,
  onApprove,
  isApproving = false,
  assigneeValue = defaultStaffAssignmentSelection,
  staffAssigneeOptions = defaultStaffAssigneeOptions,
  onAssigneeChange,
  onSaveAssignee,
  isSavingAssignee = false,
  isEditingDraft = false,
  draftValue = "",
  onDraftChange,
  onStartEditing,
  onCancelEditing,
  onSaveDraft,
  isSavingDraft = false,
  isEditingNote = false,
  noteValue = "",
  onNoteChange,
  onStartEditingNote,
  onCancelEditingNote,
  onSaveNote,
  isSavingNote = false,
}: Readonly<{
  email?: StaffEmail;
  assignmentRecommendation?: AssignmentRecommendation | null;
  departmentSummary?: DepartmentQueueSummary | null;
  onApprove?: () => void;
  isApproving?: boolean;
  assigneeValue?: StaffAssignmentSelectValue;
  staffAssigneeOptions?: readonly string[];
  onAssigneeChange?: (value: StaffAssignmentSelectValue) => void;
  onSaveAssignee?: () => void;
  isSavingAssignee?: boolean;
  isEditingDraft?: boolean;
  draftValue?: string;
  onDraftChange?: (value: string) => void;
  onStartEditing?: () => void;
  onCancelEditing?: () => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  isEditingNote?: boolean;
  noteValue?: string;
  onNoteChange?: (value: string) => void;
  onStartEditingNote?: () => void;
  onCancelEditingNote?: () => void;
  onSaveNote?: () => void;
  isSavingNote?: boolean;
}>) {
  const { formatDateTime, formatDay, preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";

  if (!email) {
    return (
      <section className={`${dashboardPanelClassName} border-dashed p-10 text-center text-sm text-slate-500`}>
        {isPolish
          ? "Wybierz wiadomość, aby sprawdzić szkic i szczegóły przeglądu."
          : "Select a message to inspect the draft and review details."}
      </section>
    );
  }

  const senderName = email.sender.split(" <")[0] ?? email.sender;
  const rawDepartment = getEmailDepartment(email);
  const department = translateDepartment(rawDepartment, preferences.language);
  const rawApprovalState = getEmailApprovalState(email);
  const approvalState = translateCaseApprovalState(
    rawApprovalState,
    preferences.language
  );
  const routingConfidenceScore =
    email.routingDecision?.confidenceScore ?? email.confidence;
  const routingConfidenceLabel = translateRoutingConfidence(
    email.routingDecision?.confidence ??
      (routingConfidenceScore >= 82
        ? "High"
        : routingConfidenceScore >= 66
          ? "Medium"
          : "Low"),
    preferences.language
  );
  const suggestedOwners =
    email.routingDecision?.suggestedAssignees.filter((owner) =>
      staffAssigneeOptions.includes(owner)
    ) ?? [];
  const primaryLibraryHref = email.source
    ? `/dashboard/knowledge-base?document=${encodeURIComponent(
        email.source
      )}&context=${encodeURIComponent(
        email.sourceCitations[0]?.excerpt ?? email.summary
      )}`
    : null;

  const hasDraft = email.aiDraft !== null;
  const isAlreadySent = email.status === "Auto-sent";
  const canApprove =
    hasDraft &&
    !isAlreadySent &&
    !isApproving &&
    !isSavingAssignee &&
    !isSavingDraft &&
    !isSavingNote &&
    !isEditingDraft &&
    !isEditingNote &&
    Boolean(onApprove);
  const canEnterEditMode =
    !isAlreadySent &&
    !isApproving &&
    !isSavingAssignee &&
    !isSavingDraft &&
    !isSavingNote &&
    !isEditingNote &&
    Boolean(onStartEditing);
  const canSaveDraft =
    draftValue.trim().length > 0 && !isSavingDraft && Boolean(onSaveDraft);
  const canEditAssignment =
    !isApproving &&
    !isSavingAssignee &&
    !isSavingDraft &&
    !isSavingNote &&
    !isEditingDraft &&
    !isEditingNote;
  const canSaveAssignee =
    canEditAssignment &&
    Boolean(onSaveAssignee) &&
    assigneeValue !== (email.assignee ?? defaultStaffAssignmentSelection);
  const canUseAssignmentRecommendation =
    Boolean(assignmentRecommendation) &&
    canEditAssignment &&
    assigneeValue !== assignmentRecommendation?.assignee;
  const canEnterNoteEditMode =
    !isApproving &&
    !isSavingAssignee &&
    !isSavingDraft &&
    !isSavingNote &&
    !isEditingDraft &&
    Boolean(onStartEditingNote);
  const canSaveNote =
    !isSavingNote &&
    Boolean(onSaveNote) &&
    !isEditingDraft &&
    noteValue.trim() !== (email.staffNote ?? "");

  let reviewMessage =
    isPolish
      ? "Zatwierdź tę odpowiedź, aby wysłać ją do odbiorcy albo zakończyć lokalny fallback, jeśli dostawca poczty nie jest jeszcze skonfigurowany."
      : "Approve this response to send it to the recipient, or finish in the local fallback when outbound mail is not configured yet.";

  if (isEditingDraft) {
    reviewMessage = isPolish
      ? "Zaktualizuj szkic, zapisz go w skrzynce i zatwierdź, gdy odpowiedź będzie gotowa."
      : "Update the draft, save it to the mailbox store, and approve it when the response is ready.";
  } else if (isAlreadySent) {
    reviewMessage = isPolish
      ? "Ta wiadomość została już wysłana albo zakończona w lokalnym fallbacku."
      : "This message has already been sent or completed in the local fallback.";
  } else if (!hasDraft) {
    reviewMessage = isPolish
      ? "Szkic AI nie jest jeszcze dostępny, więc ta sprawa nadal wymaga ręcznej odpowiedzi."
      : "No AI draft is available yet, so this case still needs a manual response.";
  } else if (email.routingDecision?.escalationReason) {
    reviewMessage = isPolish
      ? "System wykrył sygnały eskalacji albo niskiej pewności routingu, więc człowiek powinien przejrzeć szkic i finalny routing przed zatwierdzeniem."
      : "The system detected escalation or low-confidence routing signals, so a human should review the draft and final routing before approval.";
  } else if (isApproving || isSavingDraft) {
    reviewMessage = isPolish
      ? "Zapisywanie decyzji i aktualizacja stanu skrzynki."
      : "Saving the decision and updating the mailbox state.";
  }

  const approveLabel = isApproving
    ? isPolish
      ? "Wysyłanie..."
      : "Sending..."
    : isAlreadySent
      ? isPolish
        ? "Już wysłane"
        : "Already Sent"
      : !hasDraft
        ? isPolish
          ? "Wymagany ręczny przegląd"
          : "Manual Review Required"
        : isPolish
          ? "Zatwierdź i wyślij"
          : "Approve & Send";
  const editLabel = isAlreadySent
    ? isPolish
      ? "Zablokowane po wysłaniu"
      : "Locked After Send"
    : hasDraft
      ? isPolish
        ? "Edytuj szkic"
        : "Edit Draft"
      : isPolish
        ? "Utwórz szkic"
        : "Compose Draft";
  const saveAssigneeLabel = isSavingAssignee
    ? isPolish
      ? "Zapisywanie..."
      : "Saving..."
    : isPolish
      ? "Zapisz właściciela"
      : "Save Owner";
  const saveDraftLabel = isSavingDraft
    ? isPolish
      ? "Zapisywanie..."
      : "Saving..."
    : isPolish
      ? "Zapisz szkic"
      : "Save Draft";
  const noteLabel =
    email.staffNote && email.staffNote.length > 0
      ? isPolish
        ? "Edytuj notatkę"
        : "Edit Note"
      : isPolish
        ? "Dodaj notatkę"
        : "Add Note";
  const saveNoteLabel = isSavingNote
    ? isPolish
      ? "Zapisywanie..."
      : "Saving..."
    : isPolish
      ? "Zapisz notatkę"
      : "Save Note";
  const citationDocumentCount = new Set(
    email.sourceCitations.map((citation) => citation.documentName)
  ).size;
  const citationGroups = groupEmailSourceCitations(email.sourceCitations);
  const groundingAssessment = assessEmailGrounding(email, preferences.language);
  const approvalGuidance = getEmailApprovalGuidance(email, preferences.language);
  const draftModeLabel = hasDraft
    ? email.manualReviewReason
      ? "Manual draft saved"
      : "AI-assisted draft"
    : "Manual reply needed";
  const detailTitle = isAlreadySent
    ? "Sent Reply"
    : hasDraft
      ? "Review Draft"
      : "Manual Review";
  const citationSummaryLabel =
    email.sourceCitations.length === 0
      ? "No supporting excerpts attached yet."
      : `${email.sourceCitations.length} supporting passage${email.sourceCitations.length === 1 ? "" : "s"} from ${citationDocumentCount} source document${citationDocumentCount === 1 ? "" : "s"}.`;
  const readinessItems = [
    {
      label: "Message owner assigned",
      complete: email.assignee !== null,
    },
    {
      label: "Draft available for review",
      complete: hasDraft,
    },
    {
      label: "Policy source attached",
      complete: email.source !== null,
    },
    {
      label: "No unresolved manual hold",
      complete: email.manualReviewReason === null,
    },
    {
      label: "Grounding strong enough to approve",
      complete: groundingAssessment.approvalReady,
    },
  ];
  const readinessCount = readinessItems.filter((item) => item.complete).length;

  return (
    <section className="space-y-4">
      <div className={`${dashboardPanelClassName} flex flex-wrap items-start justify-between gap-4 px-5 py-5 md:px-6`}>
        <div className="flex min-w-0 gap-4">
          <DashboardAvatar
            name={senderName}
            className="h-14 w-14 shrink-0 text-[10px]"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {department} {isPolish ? "workflow" : "Workflow"}
            </p>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[#1E2340]">
              {detailTitle}
            </h3>
            <p className="mt-2 truncate text-sm text-slate-500">{senderName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-[#4F57E8] shadow-[0_12px_24px_rgba(144,156,182,0.12)]">
            {department}
          </span>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-[0_12px_24px_rgba(144,156,182,0.12)] ${approvalStateClasses[rawApprovalState]}`}
          >
            {approvalState}
          </span>
          <span className="rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-[0_12px_24px_rgba(144,156,182,0.12)]">
            {routingConfidenceLabel} routing • {routingConfidenceScore}%
          </span>
          {email.source ? (
            <span className="rounded-full bg-[#EEF0FF] px-3 py-1.5 text-xs font-semibold text-[#5C61FF]">
              {email.source}
            </span>
          ) : null}
          <EmailStatusBadge status={email.status} />
        </div>
      </div>

      <DetailCard
        title={isPolish ? "Oryginalna wiadomość" : "Original Message"}
        subtitle={email.sender}
      >
        <p className="text-sm text-slate-500">{isPolish ? "Temat" : "Subject"}</p>
        <p className="mb-4 mt-1 text-base font-semibold text-slate-900">
          {email.subject}
        </p>
        <p className="text-sm text-slate-500">{isPolish ? "Wiadomość" : "Message"}</p>
        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
          {email.body}
        </p>
      </DetailCard>

      <DetailCard
        title={isPolish ? "Podsumowanie sprawy" : "Case Summary"}
        subtitle={isPolish ? "Czego dotyczy ta sprawa" : "What this case is about"}
      >
        <p className="text-sm leading-6 text-slate-700">{email.summary}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/75 bg-white/65 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Received
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatDay(email.receivedAt)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDateTime(email.receivedAt)}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/75 bg-white/65 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Last Updated
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatDay(email.lastUpdatedAt)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDateTime(email.lastUpdatedAt)}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/75 bg-white/65 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Priority
            </p>
            <span
              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${emailPriorityClasses[email.priority]}`}
            >
            {translateEmailPriority(email.priority, preferences.language)}
          </span>
            <p className="mt-2 text-xs text-slate-500">
              {email.assignee
                ? `Currently owned by ${email.assignee}`
                : "Waiting for assignment"}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/75 bg-white/65 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Approval State
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {approvalState}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {email.manualReviewReason
                ? isPolish
                  ? "Ręczny przegląd jest nadal wymagany."
                  : "Manual review is still required."
                : isPolish
                  ? "Stan routingu i przeglądu jest obecnie czysty."
                  : "Routing and review state are currently clear."}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Routing Decision
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {department} • {routingConfidenceLabel}{" "}
                {isPolish ? "pewność" : "confidence"}
              </p>
            </div>
            <span className="rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-500">
              {routingConfidenceScore}%
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {email.routingDecision
              ? getLocalizedRoutingDecisionReason(
                  email.routingDecision,
                  preferences.language
                )
              : isPolish
                ? "Ta sprawa podąża aktualnie wybraną ścieżką działu."
                : "This case is following the currently selected department path."}
          </p>
          {email.routingDecision?.signals.length ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              {isPolish ? "Sygnały" : "Signals"}:{" "}
              {getLocalizedRoutingSignalList(
                email.routingDecision.signals,
                preferences.language
              ).join(", ")}
            </p>
          ) : null}
          {suggestedOwners.length ? (
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Suggested owners for this workflow: {suggestedOwners.join(", ")}.
            </p>
          ) : null}
        </div>

        {email.manualReviewReason ? (
          <div className="mt-5 rounded-[24px] border border-[#FFE7B3] bg-[#FFF8E5] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Manual Review Reason
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {email.manualReviewReason}
            </p>
          </div>
        ) : null}
      </DetailCard>

      <DetailCard
        title="AI Draft Response"
        subtitle={email.source ?? "No source attached"}
      >
        {email.source ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#DCE1FF] bg-[#F5F6FF] px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2E5FA3]">
                Retrieved Source
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {email.source}
              </p>
            </div>
            <Link
              href={primaryLibraryHref ?? "/dashboard/knowledge-base"}
              className={dashboardSecondaryButtonClassName}
            >
              Open Source Context
            </Link>
          </div>
        ) : null}

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-white/75 bg-white/65 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Draft Mode
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {draftModeLabel}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/75 bg-white/65 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Grounding
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {translateGroundingStrength(
                groundingAssessment.strength,
                preferences.language
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {groundingAssessment.score}% support score
            </p>
          </div>

          <div className="rounded-[24px] border border-white/75 bg-white/65 p-4 shadow-[0_16px_34px_rgba(143,155,181,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Approval Posture
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {groundingAssessment.approvalReady
                ? "Ready for approval"
                : "Needs human review"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {citationDocumentCount} source document
              {citationDocumentCount === 1 ? "" : "s"} referenced
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2E5FA3]">
                Grounding Readout
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {groundingAssessment.summary}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${groundingStrengthClasses[groundingAssessment.strength]}`}
            >
              {translateGroundingStrength(
                groundingAssessment.strength,
                preferences.language
              )}{" "}
              {isPolish ? "wsparcie" : "support"}
            </span>
          </div>

          <div className="mt-4 h-2.5 w-full rounded-full bg-slate-200">
            <div
              className={`h-2.5 rounded-full ${getGroundingBarClassName(
                groundingAssessment.strength
              )}`}
              style={{ width: `${groundingAssessment.score}%` }}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[20px] border border-[#D8F0E4] bg-[#F5FCF8] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                What looks safe
              </p>
              <div className="mt-3 space-y-2">
                {groundingAssessment.positives.length > 0 ? (
                  groundingAssessment.positives.map((item) => (
                    <p key={item} className="text-sm leading-6 text-emerald-950">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-emerald-950">
                    No strong support signals are attached yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#FFE1E8] bg-[#FFF6F8] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B4375C]">
                What still needs review
              </p>
              <div className="mt-3 space-y-2">
                {groundingAssessment.risks.length > 0 ? (
                  groundingAssessment.risks.map((item) => (
                    <p key={item} className="text-sm leading-6 text-[#7A2440]">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[#7A2440]">
                    No blocking review risks are currently flagged.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#FFE1E8] bg-[#FFF6F8] p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B4375C]">
              Approval Blockers
            </p>
            <div className="mt-3 space-y-2">
              {approvalGuidance.blockers.length > 0 ? (
                approvalGuidance.blockers.map((blocker) => (
                  <p key={blocker} className="text-sm leading-6 text-[#7A2440]">
                    {blocker}
                  </p>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#7A2440]">
                  No blocking issues are currently flagged.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#DCE1FF] bg-[#F5F6FF] p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2E5FA3]">
              Next Review Actions
            </p>
            <div className="mt-3 space-y-2">
              {approvalGuidance.nextActions.map((action) => (
                <p key={action} className="text-sm leading-6 text-slate-700">
                  {action}
                </p>
              ))}
            </div>
          </div>
        </div>

        {isEditingDraft ? (
          <div className="space-y-3">
            <textarea
              value={draftValue}
              onChange={(event) => onDraftChange?.(event.target.value)}
              rows={10}
              className="w-full rounded-[28px] border border-white/75 bg-white/82 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
              placeholder="Write the response that should be sent to the student or staff member."
            />
            <p className="text-xs font-medium text-slate-500">
              Saving this draft will persist it for the current prototype mailbox.
            </p>
          </div>
        ) : email.aiDraft ? (
          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
            {email.aiDraft}
          </p>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            No AI draft generated for this message. Manual intervention required.
          </p>
        )}

        {email.sourceCitations.length > 0 ? (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2E5FA3]">
              Draft Citations
            </p>
            <p className="text-sm leading-6 text-slate-500">
              {citationSummaryLabel}
            </p>
            {citationGroups.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {citationGroups.map((group) => (
                  <div
                    key={group.documentName}
                    className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {group.documentName}
                      </p>
                      <span className="rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-500">
                        {group.citationCount} cited passage
                        {group.citationCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Coverage summary
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {group.reasons.join(" ")}
                    </p>
                    <Link
                      href={`/dashboard/knowledge-base?document=${encodeURIComponent(
                        group.documentName
                      )}&context=${encodeURIComponent(
                        group.excerpts[0] ?? email.summary
                      )}&reason=${encodeURIComponent(group.reasons[0] ?? "Supports the current draft.")}`}
                      className="mt-4 inline-flex text-xs font-semibold text-[#2E5FA3] transition hover:text-[#1F3864]"
                    >
                      Open grouped context
                    </Link>
                  </div>
                ))}
              </div>
            ) : null}
            {email.sourceCitations.map((citation) => (
              <div
                key={citation.id}
                className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {citation.documentName}
                  </p>
                  <Link
                    href={`/dashboard/knowledge-base?document=${encodeURIComponent(
                      citation.documentName
                    )}&context=${encodeURIComponent(
                      citation.excerpt
                    )}&reason=${encodeURIComponent(citation.reason)}`}
                    className="text-xs font-semibold text-[#2E5FA3] transition hover:text-[#1F3864]"
                  >
                    View Context
                  </Link>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {citation.excerpt}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Why it matters: {citation.reason}
                </p>
              </div>
            ))}
          </div>
        ) : email.source ? (
          <div className="mt-5 rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2E5FA3]">
              Grounding Status
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {citationSummaryLabel} The case is linked to a source document, but no excerpted passages are stored with this draft yet.
            </p>
          </div>
        ) : null}
      </DetailCard>

      <DetailCard title="Conversation Timeline" subtitle="Recent case context">
        {email.threadHistory.length === 0 ? (
          <p className="text-sm leading-6 text-slate-500">
            No timeline events have been recorded for this case yet.
          </p>
        ) : (
          <div className="space-y-3">
            {email.threadHistory.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {entry.label}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                      {entry.kind} • {entry.author}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {formatDateTime(entry.sentAt)}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {entry.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </DetailCard>

      <DetailCard title="Ownership" subtitle="Route this message to a teammate">
        {assignmentRecommendation ? (
          <div className="mb-5 rounded-[24px] border border-[#DCE1FF] bg-[#F5F6FF] p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2E5FA3]">
                  Assignment Guidance
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Recommended owner: {assignmentRecommendation.assignee}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${workloadPressureClasses[assignmentRecommendation.pressure]}`}
              >
                {translateWorkloadPressure(
                  assignmentRecommendation.pressure,
                  preferences.language
                )}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700">
              {assignmentRecommendation.reason}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              {assignmentRecommendation.queueSummary}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {assignmentRecommendation.departmentSummary}
            </p>
            {departmentSummary ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {departmentSummary.pressure === "Overloaded"
                  ? `${departmentSummary.department} is currently overloaded, so balancing this case matters more than continuity.`
                  : departmentSummary.pressure === "Busy"
                    ? `${departmentSummary.department} is busy, so new assignments should follow the lightest owner in rotation.`
                    : `${departmentSummary.department} is balanced enough to keep continuity with the current owner if needed.`}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <label
            className="block text-sm font-medium text-slate-600"
            htmlFor="message-owner"
          >
            Current owner
          </label>
          <select
            id="message-owner"
            value={assigneeValue}
            onChange={(event) =>
              onAssigneeChange?.(
                event.target.value as StaffAssignmentSelectValue
              )
            }
            disabled={!canEditAssignment}
            className={`w-full rounded-[22px] px-4 py-3.5 text-sm text-slate-700 outline-none transition ${
              canEditAssignment
                ? "border border-white/75 bg-white/82 shadow-[0_14px_36px_rgba(143,155,181,0.12)] focus:border-[#6A6CFF]/35 focus:bg-white"
                : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            }`}
          >
            <option value={defaultStaffAssignmentSelection}>
              {translateStaffAssignmentSelectValue(
                defaultStaffAssignmentSelection,
                preferences.language
              )}
            </option>
            {staffAssigneeOptions.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
          <p className="text-xs font-medium text-slate-500">
            {email.assignee
              ? `${email.assignee} currently owns this case.`
              : "This case is currently waiting in the unassigned pool."}
          </p>
          {suggestedOwners.length ? (
            <p className="text-xs font-medium text-[#4F57E8]">
              Suggested by routing: {suggestedOwners.join(", ")}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {assignmentRecommendation && canUseAssignmentRecommendation ? (
            <button
              type="button"
              onClick={() => onAssigneeChange?.(assignmentRecommendation.assignee)}
              className={`text-sm ${dashboardSecondaryButtonClassName}`}
            >
              Use Recommendation
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSaveAssignee}
            disabled={!canSaveAssignee}
            className={`text-sm ${
              canSaveAssignee
                ? dashboardPrimaryButtonClassName
                : disabledPrimaryButtonClassName
            }`}
          >
            {saveAssigneeLabel}
          </button>
        </div>
      </DetailCard>

      <DetailCard title="Internal Notes" subtitle="Staff-only context">
        {isEditingNote ? (
          <div className="space-y-3">
            <textarea
              value={noteValue}
              onChange={(event) => onNoteChange?.(event.target.value)}
              rows={6}
              className="w-full rounded-[28px] border border-white/75 bg-white/82 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
              placeholder="Capture staff-only context, follow-up reminders, or escalation notes."
            />
            <p className="text-xs font-medium text-slate-500">
              Leave this empty and save if you want to clear the current note.
            </p>
          </div>
        ) : email.staffNote ? (
          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
            {email.staffNote}
          </p>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            No internal note has been saved for this message yet.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {isEditingNote ? (
            <>
              <button
                type="button"
                onClick={onSaveNote}
                disabled={!canSaveNote}
                className={`text-sm ${
                  canSaveNote
                    ? dashboardPrimaryButtonClassName
                    : disabledPrimaryButtonClassName
                }`}
              >
                {saveNoteLabel}
              </button>
              <button
                type="button"
                onClick={onCancelEditingNote}
                disabled={isSavingNote}
                className={`text-sm ${
                  isSavingNote
                    ? disabledSecondaryButtonClassName
                    : dashboardSecondaryButtonClassName
                }`}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartEditingNote}
              disabled={!canEnterNoteEditMode}
              className={`text-sm ${
                canEnterNoteEditMode
                  ? dashboardSecondaryButtonClassName
                  : disabledSecondaryButtonClassName
              }`}
            >
              {noteLabel}
            </button>
          )}
        </div>
      </DetailCard>

      <DetailCard title="Review Signals" subtitle="Confidence and next action">
        <div className="mb-5 rounded-[24px] border border-white/75 bg-white/62 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">
              Approval Readiness
            </p>
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {readinessCount}/{readinessItems.length} ready
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {readinessItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[18px] border border-white/75 bg-white/82 px-3 py-2.5"
              >
                <span className="text-sm text-slate-700">{item.label}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.complete
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.complete ? "Ready" : "Needs Attention"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-600">
            Routing Confidence
          </p>
          <span className="text-sm font-semibold text-[#2E5FA3]">
            {routingConfidenceScore}%
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-[#5b8fdb] to-[#1F3864]"
            style={{ width: `${routingConfidenceScore}%` }}
          />
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-500">{reviewMessage}</p>

        {!groundingAssessment.approvalReady ? (
          <div className="mt-5 rounded-[24px] border border-[#FFE1E8] bg-[#FFF6F8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B4375C]">
              Approval Hold
            </p>
            <p className="mt-2 text-sm leading-6 text-[#7A2440]">
              This case is not yet marked safe to approve. Review the grounding readout above and resolve the remaining risks before sending.
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {isEditingDraft ? (
            <>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={!canSaveDraft}
                className={`text-sm ${
                  canSaveDraft
                    ? dashboardPrimaryButtonClassName
                    : disabledPrimaryButtonClassName
                }`}
              >
                {saveDraftLabel}
              </button>
              <button
                type="button"
                onClick={onCancelEditing}
                disabled={isSavingDraft}
                className={`text-sm ${
                  isSavingDraft
                    ? disabledSecondaryButtonClassName
                    : dashboardSecondaryButtonClassName
                }`}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onApprove}
                disabled={!canApprove}
                className={`text-sm ${
                  canApprove
                    ? dashboardPrimaryButtonClassName
                    : disabledPrimaryButtonClassName
                }`}
              >
                {approveLabel}
              </button>
              <button
                type="button"
                onClick={onStartEditing}
                disabled={!canEnterEditMode}
                className={`text-sm ${
                  canEnterEditMode
                    ? dashboardGhostButtonClassName
                    : disabledSecondaryButtonClassName
                }`}
              >
                {editLabel}
              </button>
            </>
          )}
        </div>
      </DetailCard>
    </section>
  );
}
