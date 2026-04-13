"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  DashboardIcon,
  dashboardPanelClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import {
  emailCategoryOptions,
  emailPriorityOptions,
  isValidEmailAddress,
  minimumEmailBodyLength,
  minimumEmailSubjectLength,
  minimumSenderNameLength,
  type EmailCategory,
  type EmailPriority,
  type StaffEmail,
  translateDepartment,
  translateEmailPriority,
  translateRoutingConfidence,
} from "@/lib/email-data";
import {
  getDraftPathLabel,
  getRoutingDestinationLabel,
  inferLocalRoutingDecision,
} from "@/lib/local-routing";
import { useUserPreferences } from "@/components/dashboard/user-preferences-provider";

type ComposeResponse = {
  email: StaffEmail;
};

type ComposeErrorResponse = {
  error?: string;
};

function getComposeErrorMessage(data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    const error = data.error;

    if (typeof error === "string" && error.length > 0) {
      return error;
    }
  }

  return null;
}

export default function ComposePage() {
  const { preferences } = useUserPreferences();
  const isPolish = preferences.language === "Polish";
  const router = useRouter();
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [category, setCategory] = useState<EmailCategory>("Admissions");
  const [priority, setPriority] = useState<EmailPriority>("Medium");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmedName = senderName.trim();
  const trimmedEmail = senderEmail.trim();
  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  const composeChecks = {
    senderName: trimmedName.length >= minimumSenderNameLength,
    senderEmail: isValidEmailAddress(trimmedEmail),
    subject: trimmedSubject.length >= minimumEmailSubjectLength,
    body: trimmedBody.length >= minimumEmailBodyLength,
  };
  const routingPreview = inferLocalRoutingDecision({
    category,
    priority,
    subject,
    body,
  }, preferences.language);
  const likelyDestination = getRoutingDestinationLabel(
    routingPreview,
    preferences.language
  );
  const likelyDraftMode = getDraftPathLabel(
    routingPreview,
    preferences.language
  );
  const canSubmit =
    composeChecks.senderName &&
    composeChecks.senderEmail &&
    composeChecks.subject &&
    composeChecks.body &&
    !isSubmitting;
  const remainingBodyCharacters = Math.max(
    0,
    minimumEmailBodyLength - trimmedBody.length
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setSubmitError(
        isPolish
          ? "Uzupełnij wszystkie pola przed utworzeniem sprawy."
          : "Fill out all fields before creating the case."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderName: trimmedName,
          senderEmail: trimmedEmail,
          category,
          priority,
          subject: trimmedSubject,
          body: trimmedBody,
          language: preferences.language,
        }),
      });
      const data = (await response.json()) as ComposeResponse | ComposeErrorResponse;

      if (!response.ok || !("email" in data)) {
        throw new Error(
          getComposeErrorMessage(data) ??
            (isPolish
              ? "Nie udało się utworzyć sprawy."
              : "Unable to create the case.")
        );
      }

      const destination =
        data.email.status === "Escalated"
          ? `/dashboard/inbox?view=escalations&emailId=${encodeURIComponent(data.email.id)}`
          : `/dashboard/inbox?emailId=${encodeURIComponent(data.email.id)}`;

      router.push(destination);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isPolish
            ? "Nie udało się utworzyć sprawy."
            : "Unable to create the case."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DashboardTopBar label={isPolish ? "Nowa sprawa" : "Compose New Case"} />

      <DashboardPageHeader
        eyebrow={isPolish ? "Ręczne przyjęcie" : "Manual Intake"}
        title={isPolish ? "Utwórz nową sprawę" : "Compose New Case"}
        description={
          isPolish
            ? "Utwórz nową lokalną sprawę mailową, zapisz pierwszy rekord przepływu i skieruj ją do przeglądu lub eskalacji na podstawie treści."
            : "Create a new local mailbox case, generate the first workflow record, and route it into review or escalation based on the content."
        }
        meta={isPolish ? "Lokalny przepływ tworzenia" : "Local creation flow"}
        actions={
          <Link
            href="/dashboard/inbox"
            className={dashboardSecondaryButtonClassName}
          >
            {isPolish ? "Wróć do skrzynki" : "Back to Inbox"}
          </Link>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <form
          onSubmit={handleSubmit}
          className={`${dashboardPanelClassName} space-y-5 p-5 md:p-6`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {isPolish ? "Szczegóły przyjęcia" : "Intake Details"}
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#1E2340]">
              {isPolish ? "Utwórz nową sprawę wiadomości" : "Create a new message case"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {isPolish
                ? "To tworzy nową lokalną sprawę, dodaje ją do skrzynki i natychmiast zapisuje zdarzenie aktywności."
                : "This creates a new local case, adds it to the mailbox store, and writes an activity event immediately."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {isPolish ? "Nazwa nadawcy" : "Sender name"}
              </span>
              <input
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                className="w-full rounded-[22px] border border-white/80 bg-white/82 px-4 py-3.5 text-sm text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
                placeholder={isPolish ? "Jan Kowalski" : "Maya Thompson"}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {isPolish ? "Email nadawcy" : "Sender email"}
              </span>
              <input
                type="email"
                value={senderEmail}
                onChange={(event) => setSenderEmail(event.target.value)}
                className="w-full rounded-[22px] border border-white/80 bg-white/82 px-4 py-3.5 text-sm text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
                placeholder="maya@example.edu"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {isPolish ? "Kategoria" : "Category"}
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as EmailCategory)}
                className="w-full rounded-[22px] border border-white/80 bg-white/82 px-4 py-3.5 text-sm text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
              >
                {emailCategoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateDepartment(option, preferences.language)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {isPolish ? "Priorytet" : "Priority"}
              </span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as EmailPriority)}
                className="w-full rounded-[22px] border border-white/80 bg-white/82 px-4 py-3.5 text-sm text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
              >
                {emailPriorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {translateEmailPriority(option, preferences.language)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isPolish ? "Temat" : "Subject"}
            </span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-[22px] border border-white/80 bg-white/82 px-4 py-3.5 text-sm text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
              placeholder={
                isPolish
                  ? "Pytanie o termin stypendium"
                  : "Question about scholarship deadline"
              }
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isPolish ? "Treść wiadomości" : "Message body"}
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              className="w-full rounded-[28px] border border-white/80 bg-white/82 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_14px_36px_rgba(143,155,181,0.12)] outline-none transition focus:border-[#6A6CFF]/35 focus:bg-white"
              placeholder={
                isPolish
                  ? "Wklej lub wpisz tutaj treść przychodzącej wiadomości."
                  : "Paste or write the incoming message content here."
              }
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span
                className={
                  composeChecks.body ? "text-[#4F57E8]" : "text-slate-400"
                }
              >
                {isPolish
                  ? `Treść wiadomości powinna mieć co najmniej ${minimumEmailBodyLength} znaków.`
                  : `Message body should be at least ${minimumEmailBodyLength} characters.`}
              </span>
              <span
                className={
                  composeChecks.body ? "text-[#4F57E8]" : "text-slate-400"
                }
              >
                {composeChecks.body
                  ? isPolish
                    ? "Gotowe"
                    : "Ready"
                  : isPolish
                    ? `Brakuje jeszcze ${remainingBodyCharacters} znaków`
                    : `${remainingBodyCharacters} more characters needed`}
              </span>
            </div>
          </label>

          {submitError ? (
            <div className="rounded-[24px] border border-[#FFD2DA] bg-[#FFF1F4] px-4 py-3 text-sm text-[#B4375C]">
              {submitError}
            </div>
          ) : null}

          {!canSubmit ? (
            <div className="rounded-[24px] border border-white/75 bg-white/62 px-4 py-3 text-sm text-slate-500 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
              {isPolish
                ? "Uzupełnij wszystkie pola, aby włączyć tworzenie sprawy."
                : "Complete all fields to enable case creation."}
            </div>
          ) : null}

          <div className="rounded-[24px] border border-white/75 bg-white/62 px-4 py-4 shadow-[0_14px_32px_rgba(143,155,181,0.1)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {isPolish ? "Podgląd routingu na żywo" : "Live Routing Preview"}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#1E2340]">
              {routingPreview.escalationReason
                ? isPolish
                  ? "Wykryto sygnały ręcznego przeglądu w treści zgłoszenia."
                  : "Manual-review signals detected in the intake text."
                : isPolish
                  ? `To zgłoszenie obecnie pasuje do przepływu ${translateDepartment(
                      routingPreview.department,
                      preferences.language
                    )}.`
                  : `This intake currently aligns with the ${routingPreview.department} workflow.`}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {routingPreview.reason}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/86 px-3 py-1.5 text-xs font-semibold text-[#4F57E8]">
                {isPolish ? "Sugerowany dział" : "Suggested dept"}:{" "}
                {translateDepartment(routingPreview.department, preferences.language)}
              </span>
              <span className="rounded-full bg-white/86 px-3 py-1.5 text-xs font-semibold text-slate-500">
                {translateRoutingConfidence(
                  routingPreview.confidence,
                  preferences.language
                )}{" "}
                {isPolish ? "pewność" : "confidence"} • {routingPreview.confidenceScore}%
              </span>
              <span className="rounded-full bg-white/86 px-3 py-1.5 text-xs font-semibold text-slate-500">
                {isPolish ? "Miejsce docelowe" : "Destination"}: {likelyDestination}
              </span>
              {routingPreview.suggestedAssignees.length > 0 ? (
                <span className="rounded-full bg-white/86 px-3 py-1.5 text-xs font-semibold text-slate-500">
                  {isPolish ? "Sugerowani właściciele" : "Suggested owners"}:{" "}
                  {routingPreview.suggestedAssignees.join(", ")}
                </span>
              ) : null}
            </div>
            {routingPreview.signals.length > 0 ? (
              <p className="mt-4 text-xs leading-6 text-slate-500">
                {isPolish ? "Sygnały" : "Signals"}: {routingPreview.signals.join(", ")}
              </p>
            ) : null}
            {routingPreview.escalationReason ? (
              <p className="mt-3 rounded-[18px] border border-[#FFD2DA] bg-[#FFF1F4] px-3 py-2 text-xs font-medium text-[#B4375C]">
                {routingPreview.escalationReason}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className={
                canSubmit
                  ? dashboardPrimaryButtonClassName
                  : "inline-flex items-center justify-center rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500"
              }
            >
              {isSubmitting
                ? isPolish
                  ? "Tworzenie..."
                  : "Creating..."
                : isPolish
                  ? "Utwórz sprawę"
                  : "Create Case"}
            </button>
            <Link
              href="/dashboard/inbox"
              className={dashboardSecondaryButtonClassName}
            >
              {isPolish ? "Anuluj" : "Cancel"}
            </Link>
          </div>
        </form>

        <div className="space-y-4">
          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#EEF0FF] text-[#5C61FF]">
                <DashboardIcon name="sparkles" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {isPolish ? "Podgląd przepływu" : "Workflow Preview"}
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[#1E2340]">
                  {isPolish ? "Co stanie się dalej" : "What happens next"}
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                {isPolish
                  ? "Nowe sprawy są natychmiast zapisywane w lokalnej skrzynce i dodawane do dziennika aktywności."
                  : "New cases are saved into the local mailbox immediately and added to the activity log."}
              </p>
              <p>
                {isPolish
                  ? "Standardowe zgłoszenia trafiają do skrzynki z lokalnym szkicem do przeglądu."
                  : "Standard requests are routed into the inbox with a seeded local draft for review."}
              </p>
              <p>
                {isPolish
                  ? "Treść typu odwołania, spory lub kwestie prawne kieruje sprawę do Eskalacji."
                  : "Exception-style language like appeals, disputes, or legal issues routes the case into Escalations instead."}
              </p>
            </div>
          </article>

          <article className={`${dashboardPanelClassName} p-5 md:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {isPolish ? "Migawka routingu" : "Routing Snapshot"}
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] border border-white/75 bg-white/62 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Sugerowany dział" : "Suggested department"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {translateDepartment(routingPreview.department, preferences.language)}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/75 bg-white/62 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Kategoria zgłoszenia" : "Intake category"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {translateDepartment(category, preferences.language)}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/75 bg-white/62 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Pewność routingu" : "Routing confidence"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {translateRoutingConfidence(
                    routingPreview.confidence,
                    preferences.language
                  )}{" "}
                  ({routingPreview.confidenceScore}%)
                </p>
              </div>
              <div className="rounded-[22px] border border-white/75 bg-white/62 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Miejsce docelowe" : "Destination"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {likelyDestination}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/75 bg-white/62 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Ścieżka szkicu" : "Draft path"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {likelyDraftMode}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/75 bg-white/62 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isPolish ? "Sugerowani właściciele" : "Suggested owners"}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1E2340]">
                  {routingPreview.suggestedAssignees.join(", ")}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
