import Link from "next/link";
import {
  DashboardAvatar,
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import {
  EmailCategoryBadge,
  EmailStatusBadge,
} from "@/components/dashboard/email-badges";
import {
  approvalStateClasses,
  formatEmailDate,
  groundingStrengthClasses,
} from "@/lib/dashboard";
import {
  assessEmailGrounding,
  defaultStaffAssignmentSelection,
  getEmailApprovalGuidance,
  getEmailApprovalState,
  getEmailDepartment,
  getEmailReplyEntry,
  staffAssigneeOptions,
  type AssignmentRecommendation,
  type StaffAssignmentSelectValue,
  type StaffEmail,
} from "@/lib/email-data";

const disabledPrimaryButtonClassName =
  "inline-flex items-center justify-center rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500";

const disabledSecondaryButtonClassName =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400";

function MetaCard({
  label,
  value,
  caption,
}: Readonly<{
  label: string;
  value: string;
  caption?: string;
}>) {
  return (
    <div className="rounded-[22px] border border-white/75 bg-white/64 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
      {caption ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{caption}</p>
      ) : null}
    </div>
  );
}

function getSenderParts(sender: string) {
  const match = /^(.*?)\s*<(.*)>$/.exec(sender);

  if (!match) {
    return {
      name: sender,
      email: "",
    };
  }

  return {
    name: match[1]?.trim() || sender,
    email: match[2]?.trim() || "",
  };
}

export function InboxEmailDetailPanel({
  email,
  assignmentRecommendation,
  onApprove,
  isApproving = false,
  assigneeValue = defaultStaffAssignmentSelection,
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
  onApprove?: () => void;
  isApproving?: boolean;
  assigneeValue?: StaffAssignmentSelectValue;
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
  if (!email) {
    return (
      <section
        className={`${dashboardPanelClassName} flex min-h-[420px] items-center justify-center border-dashed px-10 py-12 text-center text-sm text-slate-500`}
      >
        Select a message to open the conversation and review the suggested reply.
      </section>
    );
  }

  const sender = getSenderParts(email.sender);
  const department = getEmailDepartment(email);
  const approvalState = getEmailApprovalState(email);
  const groundingAssessment = assessEmailGrounding(email);
  const approvalGuidance = getEmailApprovalGuidance(email);
  const replyEntry = getEmailReplyEntry(email);
  const sourcePreview = email.sourceCitations[0] ?? null;
  const routingConfidenceScore =
    email.routingDecision?.confidenceScore ?? email.confidence;
  const routingConfidenceLabel =
    email.routingDecision?.confidence ??
    (routingConfidenceScore >= 82
      ? "High"
      : routingConfidenceScore >= 66
        ? "Medium"
        : "Low");
  const primaryLibraryHref = email.source
    ? `/dashboard/knowledge-base?document=${encodeURIComponent(
        email.source
      )}&context=${encodeURIComponent(
        email.sourceCitations[0]?.excerpt ?? email.summary
      )}`
    : "/dashboard/knowledge-base";

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

  const approveLabel = isApproving
    ? "Sending..."
    : isAlreadySent
      ? "Already Sent"
      : !hasDraft
        ? "Manual Review Required"
        : "Approve & Send";
  const editLabel = isAlreadySent
    ? "Locked After Send"
    : hasDraft
      ? "Edit Reply"
      : "Compose Reply";
  const saveAssigneeLabel = isSavingAssignee ? "Saving..." : "Save Owner";
  const saveDraftLabel = isSavingDraft ? "Saving..." : "Save Reply";
  const noteLabel =
    email.staffNote && email.staffNote.length > 0 ? "Edit Note" : "Add Note";
  const saveNoteLabel = isSavingNote ? "Saving..." : "Save Note";
  const replyDateLabel = isAlreadySent ? "Reply sent" : "Reply generated";
  const replyDateValue = replyEntry
    ? formatEmailDate(replyEntry.sentAt)
    : hasDraft
      ? formatEmailDate(email.lastUpdatedAt)
      : "Not available";

  return (
    <section className="space-y-4">
      <article className={`${dashboardPanelClassName} px-5 py-5 md:px-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <DashboardAvatar
              name={sender.name}
              className="h-14 w-14 shrink-0 text-[10px]"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {department} inbox
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {email.subject}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                From {sender.name}
                {sender.email ? ` • ${sender.email}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-[0_12px_24px_rgba(144,156,182,0.12)]">
              {formatEmailDate(email.receivedAt)}
            </span>
            <EmailCategoryBadge category={department} />
            <EmailStatusBadge status={email.status} />
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${approvalStateClasses[approvalState]}`}
            >
              {approvalState}
            </span>
          </div>
        </div>
      </article>

      <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Original message
        </p>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
          {email.body}
        </p>
      </article>

      <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Suggested reply
            </p>
            <h4 className="mt-2 text-2xl font-semibold tracking-tight text-[#1E2340]">
              {isAlreadySent ? "Approved response" : "Generated response"}
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Open the message, review the prepared response, and send it only after final human review.
            </p>
          </div>

          {email.source ? (
            <Link href={primaryLibraryHref} className={dashboardSecondaryButtonClassName}>
              Open Source Context
            </Link>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <MetaCard
            label={replyDateLabel}
            value={replyDateValue}
            caption={
              replyEntry
                ? "Timestamp stored with the current suggested reply."
                : "No stored reply event is available yet."
            }
          />
          <MetaCard
            label="Source"
            value={email.source ?? "No source linked"}
            caption={
              email.sourceCitations.length > 0
                ? `${email.sourceCitations.length} supporting excerpt${email.sourceCitations.length === 1 ? "" : "s"} available.`
                : "No source excerpts are attached yet."
            }
          />
          <MetaCard
            label="Confidence"
            value={`${routingConfidenceLabel} • ${routingConfidenceScore}%`}
            caption={groundingAssessment.summary}
          />
        </div>

        {email.manualReviewReason ? (
          <div className="mt-5 rounded-[24px] border border-[#FFE1E8] bg-[#FFF6F8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B4375C]">
              Review warning
            </p>
            <p className="mt-2 text-sm leading-6 text-[#7A2440]">
              {email.manualReviewReason}
            </p>
          </div>
        ) : null}

        <div className="mt-5">
          {isEditingDraft ? (
            <div className="space-y-3">
              <textarea
                value={draftValue}
                onChange={(event) => onDraftChange?.(event.target.value)}
                rows={12}
                className="w-full rounded-[28px] border border-white/75 bg-white/82 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
                placeholder="Write the reply that should be sent to the student or staff member."
              />
              <p className="text-xs font-medium text-slate-500">
                Saving updates the prepared reply stored in the local mailbox workflow.
              </p>
            </div>
          ) : email.aiDraft ? (
            <div className="rounded-[26px] border border-white/75 bg-white/68 p-5 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                {email.aiDraft}
              </p>
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-white/80 bg-white/58 p-5 text-sm leading-6 text-slate-500">
              No generated reply is stored for this message yet. This case still needs manual review.
            </div>
          )}
        </div>

        {sourcePreview ? (
          <div className="mt-5 rounded-[24px] border border-[#DCE1FF] bg-[#F5F6FF] p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2E5FA3]">
              Source preview
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {sourcePreview.documentName}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {sourcePreview.excerpt}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Why it matters: {sourcePreview.reason}
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
      </article>

      <details
        open={email.status === "Escalated" || !groundingAssessment.approvalReady}
        className={`${dashboardPanelClassName} overflow-hidden`}
      >
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-[#1E2340] md:px-6">
          Internal workflow tools
        </summary>

        <div className="border-t border-white/70 px-5 py-5 md:px-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)]">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/75 bg-white/64 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Ownership
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keep assignment available, but out of the way of the core email reading flow.
                </p>

                <label
                  className="mt-4 block text-sm font-medium text-slate-600"
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
                  className={`mt-2 w-full rounded-[22px] px-4 py-3.5 text-sm text-slate-700 outline-none transition ${
                    canEditAssignment
                      ? "border border-white/75 bg-white/82 shadow-[0_14px_36px_rgba(143,155,181,0.12)] focus:border-[#6A6CFF]/35 focus:bg-white"
                      : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  <option value={defaultStaffAssignmentSelection}>
                    {defaultStaffAssignmentSelection}
                  </option>
                  {staffAssigneeOptions.map((assignee) => (
                    <option key={assignee} value={assignee}>
                      {assignee}
                    </option>
                  ))}
                </select>

                {assignmentRecommendation ? (
                  <p className="mt-3 text-xs leading-5 text-[#4F57E8]">
                    Suggested owner: {assignmentRecommendation.assignee}.{" "}
                    {assignmentRecommendation.reason}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  {assignmentRecommendation && canUseAssignmentRecommendation ? (
                    <button
                      type="button"
                      onClick={() =>
                        onAssigneeChange?.(assignmentRecommendation.assignee)
                      }
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
              </div>

              <div className="rounded-[24px] border border-white/75 bg-white/64 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Routing note
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {email.routingDecision?.reason ??
                    "This message is following the currently selected workflow path."}
                </p>
                {email.routingDecision?.signals.length ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Signals: {email.routingDecision.signals.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/75 bg-white/64 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Internal note
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Staff-only follow-up context.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${groundingStrengthClasses[groundingAssessment.strength]}`}
                  >
                    {groundingAssessment.strength} support
                  </span>
                </div>

                {isEditingNote ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={noteValue}
                      onChange={(event) => onNoteChange?.(event.target.value)}
                      rows={6}
                      className="w-full rounded-[28px] border border-white/75 bg-white/82 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
                      placeholder="Capture staff-only context, follow-up reminders, or escalation notes."
                    />
                    <div className="flex flex-wrap gap-3">
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
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {email.staffNote ?? "No internal note has been saved for this message yet."}
                    </p>
                    <div className="mt-4">
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
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-[24px] border border-white/75 bg-white/64 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Review reminders
                </p>
                <div className="mt-3 space-y-2">
                  {approvalGuidance.blockers.length > 0 ? (
                    approvalGuidance.blockers.map((blocker) => (
                      <p key={blocker} className="text-sm leading-6 text-slate-700">
                        {blocker}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-slate-700">
                      No active blockers are flagged for this message right now.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
