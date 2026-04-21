import Link from "next/link";
import {
  DashboardAvatar,
  dashboardGhostButtonClassName,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";
import {
  EmailCategoryBadge,
  EmailStatusBadge,
} from "@/components/dashboard/email-badges";
import {
  approvalStateClasses,
  groundingStrengthClasses,
} from "@/lib/dashboard";
import {
  assessEmailGrounding,
  defaultStaffAssignmentSelection,
  getEmailApprovalGuidance,
  getEmailApprovalState,
  getEmailDepartment,
  getEmailReplyEntry,
  staffAssigneeOptions as defaultStaffAssigneeOptions,
  translateCaseApprovalState,
  translateDepartment,
  translateGroundingStrength,
  translateRoutingConfidence,
  translateStaffAssignmentSelectValue,
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
  onRegenerateDraft,
  isRegeneratingDraft = false,
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
  onRegenerateDraft?: () => void;
  isRegeneratingDraft?: boolean;
  isEditingNote?: boolean;
  noteValue?: string;
  onNoteChange?: (value: string) => void;
  onStartEditingNote?: () => void;
  onCancelEditingNote?: () => void;
  onSaveNote?: () => void;
  isSavingNote?: boolean;
}>) {
  const { formatDateTime, preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";

  if (!email) {
    return (
      <section
        className={`${dashboardPanelClassName} flex min-h-[420px] items-center justify-center border-dashed px-10 py-12 text-center text-sm text-slate-500`}
      >
        {isPolish
          ? "Wybierz wiadomość, aby otworzyć rozmowę i przejrzeć sugerowaną odpowiedź."
          : "Select a message to open the conversation and review the suggested reply."}
      </section>
    );
  }

  const sender = getSenderParts(email.sender);
  const rawDepartment = getEmailDepartment(email);
  const department = translateDepartment(rawDepartment, preferences.language);
  const rawApprovalState = getEmailApprovalState(email);
  const approvalState = translateCaseApprovalState(
    rawApprovalState,
    preferences.language
  );
  const groundingAssessment = assessEmailGrounding(email, preferences.language);
  const approvalGuidance = getEmailApprovalGuidance(email, preferences.language);
  const replyEntry = getEmailReplyEntry(email);
  const sourcePreview = email.sourceCitations[0] ?? null;
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
  const primaryLibraryHref = email.source
    ? `/dashboard/knowledge-base?document=${encodeURIComponent(
        email.source
      )}&context=${encodeURIComponent(
        email.sourceCitations[0]?.excerpt ?? email.summary
      )}`
    : "/dashboard/knowledge-base";

  const hasDraft = email.aiDraft !== null;
  const isAlreadySent = email.status === "Auto-sent";
  const hasFailedSend =
    !isAlreadySent &&
    (email.integration?.outboundLastStatus === "failed" ||
      Boolean(email.integration?.outboundLastError));
  const outboundAttemptCount = email.integration?.outboundAttemptCount ?? 0;
  const canApprove =
    hasDraft &&
    !isAlreadySent &&
    !isApproving &&
    !isSavingAssignee &&
    !isSavingDraft &&
    !isRegeneratingDraft &&
    !isSavingNote &&
    !isEditingDraft &&
    !isEditingNote &&
    Boolean(onApprove);
  const canEnterEditMode =
    !isAlreadySent &&
    !isApproving &&
    !isSavingAssignee &&
    !isSavingDraft &&
    !isRegeneratingDraft &&
    !isSavingNote &&
    !isEditingNote &&
    Boolean(onStartEditing);
  const canRegenerateDraft =
    !isAlreadySent &&
    !isApproving &&
    !isSavingAssignee &&
    !isSavingDraft &&
    !isRegeneratingDraft &&
    !isSavingNote &&
    !isEditingDraft &&
    !isEditingNote &&
    Boolean(onRegenerateDraft);
  const canSaveDraft =
    draftValue.trim().length > 0 && !isSavingDraft && Boolean(onSaveDraft);
  const canEditAssignment =
    !isApproving &&
    !isSavingAssignee &&
    !isSavingDraft &&
    !isRegeneratingDraft &&
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
    !isRegeneratingDraft &&
    !isSavingNote &&
    !isEditingDraft &&
    Boolean(onStartEditingNote);
  const canSaveNote =
    !isSavingNote &&
    Boolean(onSaveNote) &&
    !isEditingDraft &&
    noteValue.trim() !== (email.staffNote ?? "");

  const approveLabel = isApproving
    ? isPolish
      ? "Wysyłanie..."
      : "Sending..."
    : isAlreadySent
      ? isPolish
        ? "Już wysłane"
        : "Already Sent"
      : hasFailedSend
        ? isPolish
          ? "Ponów wysyłkę"
          : "Retry Send"
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
        ? "Edytuj odpowiedź"
        : "Edit Reply"
      : isPolish
        ? "Utwórz odpowiedź"
        : "Compose Reply";
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
      ? "Zapisz odpowiedź"
      : "Save Reply";
  const regenerateDraftLabel = isRegeneratingDraft
    ? isPolish
      ? "Odświeżanie..."
      : "Refreshing..."
    : hasDraft
      ? isPolish
        ? "Wygeneruj ponownie"
        : "Regenerate Reply"
      : isPolish
        ? "Wygeneruj odpowiedź"
        : "Generate Reply";
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
  const replyDateLabel = isAlreadySent
    ? isPolish
      ? "Odpowiedź wysłana"
      : "Reply sent"
    : isPolish
      ? "Odpowiedź wygenerowana"
      : "Reply generated";
  const replyDateValue = replyEntry
    ? formatDateTime(replyEntry.sentAt)
    : hasDraft
      ? formatDateTime(email.lastUpdatedAt)
      : isPolish
        ? "Niedostępne"
        : "Not available";
  const inboundSourceValue =
    email.integration?.inboundProvider === "microsoft_graph"
      ? "Microsoft Graph"
      : email.caseOrigin === "Manual intake"
        ? isPolish
          ? "Ręczne przyjęcie"
          : "Manual intake"
        : isPolish
          ? "Lokalny fallback"
          : "Local fallback";
  const inboundSourceCaption = email.integration?.inboundReferenceUrl
    ? isPolish
      ? "Ta sprawa zachowuje odnośnik do źródłowej wiadomości w skrzynce."
      : "This case keeps a reference link back to the source mailbox message."
    : isPolish
      ? "Ta sprawa nie ma zewnętrznego odnośnika do wiadomości źródłowej."
      : "This case does not have an external source-message link.";
  const outboundSourceValue =
    hasFailedSend
      ? isPolish
        ? "Wymaga ponowienia"
        : "Retry needed"
      : email.integration?.outboundProvider === "microsoft_graph"
        ? "Microsoft Graph"
        : email.integration?.outboundSentAt
          ? isPolish
            ? "Lokalny fallback"
            : "Local fallback"
          : isPolish
            ? "Jeszcze nie wysłano"
            : "Not sent yet";
  const outboundSourceCaption = email.integration?.outboundSentAt
    ? isPolish
      ? `Ostatnia wysyłka została zapisana ${formatDateTime(email.integration.outboundSentAt)}.`
      : `Last send was recorded at ${formatDateTime(email.integration.outboundSentAt)}.`
    : hasFailedSend && email.integration?.outboundLastError
      ? email.integration.outboundLastError
      : isPolish
        ? "Odpowiedź nie została jeszcze zatwierdzona do wysyłki."
        : "The reply has not been approved for send yet.";
  const outboundAttemptsValue =
    outboundAttemptCount > 0
      ? String(outboundAttemptCount)
      : isPolish
        ? "Brak"
        : "None";
  const outboundAttemptsCaption = hasFailedSend
    ? isPolish
      ? `${email.integration?.outboundLastAttemptAt ? `Ostatnia próba: ${formatDateTime(email.integration.outboundLastAttemptAt)}. ` : ""}Ostatni błąd: ${email.integration?.outboundLastError ?? "Nieznany błąd."}`
      : `${email.integration?.outboundLastAttemptAt ? `Last attempt: ${formatDateTime(email.integration.outboundLastAttemptAt)}. ` : ""}Last error: ${email.integration?.outboundLastError ?? "Unknown error."}`
    : email.integration?.outboundLastAttemptAt
      ? isPolish
        ? `Ostatnia próba wysyłki: ${formatDateTime(email.integration.outboundLastAttemptAt)}.`
        : `Most recent send attempt: ${formatDateTime(email.integration.outboundLastAttemptAt)}.`
      : isPolish
        ? "Nie zapisano jeszcze żadnych prób wysyłki."
        : "No outbound send attempts have been recorded yet.";

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
                {department} {isPolish ? "skrzynka" : "inbox"}
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[#1E2340]">
                {email.subject}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {isPolish ? "Od" : "From"} {sender.name}
                {sender.email ? ` • ${sender.email}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-[0_12px_24px_rgba(144,156,182,0.12)]">
              {formatDateTime(email.receivedAt)}
            </span>
            <EmailCategoryBadge category={rawDepartment} />
            <EmailStatusBadge status={email.status} />
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${approvalStateClasses[rawApprovalState]}`}
            >
              {approvalState}
            </span>
          </div>
        </div>
      </article>

      <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {isPolish ? "Oryginalna wiadomość" : "Original message"}
        </p>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
          {email.body}
        </p>
      </article>

      <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isPolish ? "Sugerowana odpowiedź" : "Suggested reply"}
            </p>
            <h4 className="mt-2 text-2xl font-semibold tracking-tight text-[#1E2340]">
              {isAlreadySent
                ? isPolish
                  ? "Zatwierdzona odpowiedź"
                  : "Approved response"
                : isPolish
                  ? "Wygenerowana odpowiedź"
                  : "Generated response"}
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isPolish
                ? "Otwórz wiadomość, przejrzyj przygotowaną odpowiedź i wyślij ją po końcowym przeglądzie człowieka albo zakończ lokalnym fallbackiem, jeśli provider poczty nie jest jeszcze gotowy."
                : "Open the message, review the prepared response, and send it after final human review, or finish in the local fallback if the mail provider is not ready yet."}
            </p>
          </div>

          {email.source ? (
            <Link href={primaryLibraryHref} className={dashboardSecondaryButtonClassName}>
              {isPolish ? "Otwórz kontekst źródła" : "Open Source Context"}
            </Link>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <MetaCard
            label={replyDateLabel}
            value={replyDateValue}
            caption={
              replyEntry
                ? isPolish
                  ? "Znacznik czasu zapisany razem z bieżącą sugerowaną odpowiedzią."
                  : "Timestamp stored with the current suggested reply."
                : isPolish
                  ? "Brak jeszcze zapisanego zdarzenia odpowiedzi."
                  : "No stored reply event is available yet."
            }
          />
          <MetaCard
            label={isPolish ? "Źródło" : "Source"}
            value={email.source ?? (isPolish ? "Brak podpiętego źródła" : "No source linked")}
            caption={
              email.sourceCitations.length > 0
                ? isPolish
                  ? `${email.sourceCitations.length} dostępnych fragmentów wspierających.`
                  : `${email.sourceCitations.length} supporting excerpt${email.sourceCitations.length === 1 ? "" : "s"} available.`
                : isPolish
                  ? "Nie dołączono jeszcze żadnych fragmentów źródłowych."
                  : "No source excerpts are attached yet."
            }
          />
          <MetaCard
            label={isPolish ? "Pewność" : "Confidence"}
            value={`${routingConfidenceLabel} • ${routingConfidenceScore}%`}
            caption={groundingAssessment.summary}
          />
          <MetaCard
            label={isPolish ? "Dostawa poczty" : "Mail delivery"}
            value={outboundSourceValue}
            caption={outboundSourceCaption}
          />
        </div>

        <div className="mt-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <MetaCard
              label={isPolish ? "Źródło skrzynki" : "Mailbox source"}
              value={inboundSourceValue}
              caption={inboundSourceCaption}
            />
            <MetaCard
              label={isPolish ? "Próby wysyłki" : "Send attempts"}
              value={outboundAttemptsValue}
              caption={outboundAttemptsCaption}
            />
          </div>
        </div>

        {email.manualReviewReason ? (
          <div className="mt-5 rounded-[24px] border border-[#FFE1E8] bg-[#FFF6F8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B4375C]">
              {isPolish ? "Ostrzeżenie przeglądu" : "Review warning"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#7A2440]">
              {email.manualReviewReason}
            </p>
          </div>
        ) : null}

        {hasFailedSend ? (
          <div className="mt-5 rounded-[24px] border border-[#FFD5DB] bg-[#FFF5F7] p-4 shadow-[0_14px_32px_rgba(143,155,181,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B4375C]">
              {isPolish ? "Ostatnia wysyłka nie powiodła się" : "Last send failed"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#7A2440]">
              {email.integration?.outboundLastError ??
                (isPolish
                  ? "Ta odpowiedź wymaga ponownej próby wysyłki."
                  : "This reply needs another send attempt.")}
            </p>
            <p className="mt-2 text-xs text-[#8A3B54]">
              {isPolish
                ? "Po sprawdzeniu szkicu i konfiguracji dostawcy możesz ponowić wysyłkę z tego panelu."
                : "After checking the draft and mail-provider setup, you can retry directly from this panel."}
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
                placeholder={
                  isPolish
                    ? "Napisz odpowiedź, która powinna zostać wysłana do studenta lub pracownika."
                    : "Write the reply that should be sent to the student or staff member."
                }
              />
              <p className="text-xs font-medium text-slate-500">
                {isPolish
                  ? "Zapis aktualizuje przygotowaną odpowiedź przechowywaną w lokalnym przepływie skrzynki."
                  : "Saving updates the prepared reply stored in the local mailbox workflow."}
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
              {isPolish
                ? "Dla tej wiadomości nie zapisano jeszcze wygenerowanej odpowiedzi. Ta sprawa nadal wymaga ręcznego przeglądu."
                : "No generated reply is stored for this message yet. This case still needs manual review."}
            </div>
          )}
        </div>

        {sourcePreview ? (
          <div className="mt-5 rounded-[24px] border border-[#DCE1FF] bg-[#F5F6FF] p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2E5FA3]">
              {isPolish ? "Podgląd źródła" : "Source preview"}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {sourcePreview.documentName}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {sourcePreview.excerpt}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {isPolish ? "Dlaczego to ważne" : "Why it matters"}: {sourcePreview.reason}
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
                {isPolish ? "Anuluj" : "Cancel"}
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
              <button
                type="button"
                onClick={onRegenerateDraft}
                disabled={!canRegenerateDraft}
                className={`text-sm ${
                  canRegenerateDraft
                    ? dashboardSecondaryButtonClassName
                    : disabledSecondaryButtonClassName
                }`}
              >
                {regenerateDraftLabel}
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
          {isPolish ? "Wewnętrzne narzędzia przepływu" : "Internal workflow tools"}
        </summary>

        <div className="border-t border-white/70 px-5 py-5 md:px-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)]">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/75 bg-white/64 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Własność" : "Ownership"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isPolish
                    ? "Zachowaj przypisanie dostępne, ale poza głównym torem czytania wiadomości."
                    : "Keep assignment available, but out of the way of the core email reading flow."}
                </p>

                <label
                  className="mt-4 block text-sm font-medium text-slate-600"
                  htmlFor="message-owner"
                >
                  {isPolish ? "Aktualny właściciel" : "Current owner"}
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

                {assignmentRecommendation ? (
                  <p className="mt-3 text-xs leading-5 text-[#4F57E8]">
                    {isPolish ? "Sugerowany właściciel" : "Suggested owner"}:{" "}
                    {assignmentRecommendation.assignee}.{" "}
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
                      {isPolish ? "Użyj rekomendacji" : "Use Recommendation"}
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
                  {isPolish ? "Notatka routingu" : "Routing note"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {email.routingDecision?.reason ??
                    (isPolish
                      ? "Ta wiadomość podąża obecnie wybraną ścieżką przepływu."
                      : "This message is following the currently selected workflow path.")}
                </p>
                {email.routingDecision?.signals.length ? (
                  <p className="mt-3 text-xs text-slate-500">
                    {isPolish ? "Sygnały" : "Signals"}:{" "}
                    {email.routingDecision.signals.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/75 bg-white/64 p-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {isPolish ? "Notatka wewnętrzna" : "Internal note"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {isPolish
                        ? "Kontekst dalszych działań tylko dla pracowników."
                        : "Staff-only follow-up context."}
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

                {isEditingNote ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={noteValue}
                      onChange={(event) => onNoteChange?.(event.target.value)}
                      rows={6}
                      className="w-full rounded-[28px] border border-white/75 bg-white/82 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
                      placeholder={
                        isPolish
                          ? "Zapisz kontekst tylko dla pracowników, przypomnienia do dalszych działań albo notatki eskalacyjne."
                          : "Capture staff-only context, follow-up reminders, or escalation notes."
                      }
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
                        {isPolish ? "Anuluj" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {email.staffNote ??
                        (isPolish
                          ? "Dla tej wiadomości nie zapisano jeszcze notatki wewnętrznej."
                          : "No internal note has been saved for this message yet.")}
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
                  {isPolish ? "Przypomnienia do przeglądu" : "Review reminders"}
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
                      {isPolish
                        ? "Dla tej wiadomości nie ma obecnie aktywnych blokad."
                        : "No active blockers are flagged for this message right now."}
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
